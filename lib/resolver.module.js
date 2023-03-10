import fetch from 'cross-fetch';

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = function (url) {
  try {
    return Promise.resolve(fetch(url, {
      mode: 'cors'
    })).then(function (res) {
      if (res.status >= 400) {
        throw new Error(`Bad response ${res.statusText}`);
      }

      return res.json();
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }

        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }

    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }

    pact.s = state;
    pact.v = value;
    const observer = pact.o;

    if (observer) {
      observer(pact);
    }
  }
}

const DOC_PATH = '/.well-known/did.json';

const _Pact = /*#__PURE__*/function () {
  function _Pact() {}

  _Pact.prototype.then = function (onFulfilled, onRejected) {
    const result = new _Pact();
    const state = this.s;

    if (state) {
      const callback = state & 1 ? onFulfilled : onRejected;

      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }

        return result;
      } else {
        return this;
      }
    }

    this.o = function (_this) {
      try {
        const value = _this.v;

        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };

    return result;
  };

  return _Pact;
}();

function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}

function _do(body, test) {
  var awaitBody;

  do {
    var result = body();

    if (result && result.then) {
      if (_isSettledPact(result)) {
        result = result.v;
      } else {
        awaitBody = true;
        break;
      }
    }

    var shouldContinue = test();

    if (_isSettledPact(shouldContinue)) {
      shouldContinue = shouldContinue.v;
    }

    if (!shouldContinue) {
      return result;
    }
  } while (!shouldContinue.then);

  const pact = new _Pact();

  const reject = _settle.bind(null, pact, 2);

  (awaitBody ? result.then(_resumeAfterBody) : shouldContinue.then(_resumeAfterTest)).then(void 0, reject);
  return pact;

  function _resumeAfterBody(value) {
    result = value;

    for (;;) {
      shouldContinue = test();

      if (_isSettledPact(shouldContinue)) {
        shouldContinue = shouldContinue.v;
      }

      if (!shouldContinue) {
        break;
      }

      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        return;
      }

      result = body();

      if (result && result.then) {
        if (_isSettledPact(result)) {
          result = result.v;
        } else {
          result.then(_resumeAfterBody).then(void 0, reject);
          return;
        }
      }
    }

    _settle(pact, 1, result);
  }

  function _resumeAfterTest(shouldContinue) {
    if (shouldContinue) {
      do {
        result = body();

        if (result && result.then) {
          if (_isSettledPact(result)) {
            result = result.v;
          } else {
            result.then(_resumeAfterBody).then(void 0, reject);
            return;
          }
        }

        shouldContinue = test();

        if (_isSettledPact(shouldContinue)) {
          shouldContinue = shouldContinue.v;
        }

        if (!shouldContinue) {
          _settle(pact, 1, result);

          return;
        }
      } while (!shouldContinue.then);

      shouldContinue.then(_resumeAfterTest).then(void 0, reject);
    } else {
      _settle(pact, 1, result);
    }
  }
}

function getResolver() {
  const resolve = function (did, parsed) {
    try {
      let _interrupt;

      function _temp4() {
        const contentType = typeof didDocument?.['@context'] !== 'undefined' ? 'application/did+ld+json' : 'application/did+json';

        if (err) {
          return {
            didDocument,
            didDocumentMetadata,
            didResolutionMetadata: {
              error: 'notFound',
              message: err
            }
          };
        } else {
          return {
            didDocument,
            didDocumentMetadata,
            didResolutionMetadata: {
              contentType
            }
          };
        }
      }

      let err = null;
      let path = decodeURIComponent(parsed.id) + DOC_PATH;
      const id = parsed.id.split(':');

      if (id.length > 1) {
        path = id.map(decodeURIComponent).join('/') + '/did.json';
      }

      path = path.replace(/localhost\/(\d+)/, 'localhost:$1');
      const url = path.startsWith('localhost') ? `http://${path}` : `https://${path}`;
      const didDocumentMetadata = {};
      let didDocument = null;

      const _temp3 = _do(function () {
        function _temp2() {
          if (!_interrupt) {
            // TODO: this excludes the use of query params
            const docIdMatchesDid = didDocument?.id === did;

            if (!docIdMatchesDid) {
              err = 'resolver_error: DID document id does not match requested did'; // break // uncomment this when adding more checks
            }
          }
        }

        const _temp = _catch(function () {
          return Promise.resolve(get(url)).then(function (_get) {
            didDocument = _get;
          });
        }, function (error) {
          err = `resolver_error: DID must resolve to a valid https URL containing a JSON document: ${error}`;
          _interrupt = 1;
        });

        return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp); // eslint-disable-next-line no-constant-condition
      }, function () {
        return !_interrupt && false;
      });

      return Promise.resolve(_temp3 && _temp3.then ? _temp3.then(_temp4) : _temp4(_temp3));
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return {
    web: resolve
  };
}

export { getResolver };
//# sourceMappingURL=resolver.module.js.map
