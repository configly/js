# Configly JavaScript library
> The Node.JS and JavaScript library for [Configly](https://www.config.ly): the modern config/static
data key/value store, updateable through a web UI.

![npm](https://img.shields.io/npm/v/configly-js)
[![Try on RunKit](https://badge.runkitcdn.com/configly.svg)](https://runkit.com/npm/configly)
![GitHub](https://img.shields.io/github/license/configly/js)

Table of Contents
=================

  * [What is Configly?](#what-is-configly)
     * [Core Features](#core-features)
  * [Getting Started](#getting-started)
     * [Get your API Key](#get-your-api-key)
     * [Library installation](#library-installation)
        * [For use in browsers](#for-use-in-browsers)
  * [Usage](#usage)
     * [Using Promises](#using-promises)
  * [API Reference](#api-reference)
     * [Initialization](#initialization)
        * [Options](#options)
     * [get(key, options?)](#getapi_key-options)
        * [Basic example](#basic-example)
        * [Parallel calls](#parallel-calls)
        * [Options](#options-1)
  * [License](#license)


## What is Configly?

[Configly](https://www.config.ly) is the place software developers put their static / config data&mdash;like
 copy, styling, and minor configuration values.
They can then update that data directly from [https://wwww.config.ly](https://www.config.ly/)
without having to wait for a deploy process / app store review. Their app or webapp receives the data near instantly. 
Non-technical folks themselves can even make changes so developers can focus on hard software problems and not copy tweaks.

On the backend, [Configly](https://www.config.ly) provides a read-optimized static-data key/value store built
with the aim of being dead simple to use, low-latency, and high-availability. The client libraries
are made to be dead simple, lean, and efficient (via enhancements like caching). Configly is built for modern software development.

There are a host of other benefits to using Configly (such as ensure you do not have [data duplicated across clients](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)),
read more about the benefits at [Configly](config.ly).

### Core Features

- API to fetch strings, JSON Blobs, Booleans, aNd numbers from the Configly backend
- Web interface for modifying these values without having to deploy code (we call our beloved web interface _the Configulator_).
- High availability, high-throughput, low-latency backend. 
- Smart caching on the client libraries to minimize server requests.
- Client libraries available in expanding amount of languages.

## Getting Started

### Get your API Key
You'll need a [Configly](https://www.config.ly) account. Registration is lightning quick&mdash;you can register via
visiting [https://www.config.ly/signup](https://www.config.ly/signup).

After signing up, you can grab your API Key from [https://www.config.ly/register](https://www.config.ly/register). 
You'll need your API Key to setup the API below.

### Library installation

```sh
npm install configly-js
```

#### For use in browsers
We recommend downloading the SDK via npm and including it on your site for maximum availability.


## Usage
The package needs to be configured with your account's API key, which is available in the 
[Configly Configulator](https://www.config.ly/config)

> The golden rule of Configly library use is: **do NOT** assign the result of a `get()`
to a long-lived variable; in order for the value to fetch from the server, you must call `get()`.

```js
const Configly = require('Configly');
const configly = new Configly('YOUR_API_KEY');

configly.get('your_key_of_choice').then((value) => console.log(value));
```

### Using Promises
Configly's `get()` returns a chainable promise which can be used instead of a regular callback:

```js
configly.get('the_best_superhero')
  .then((value) => {
    let favoriteSuperhero = 'Iron Man';
    if (value['favoriteSuperhero'] != undefined) {
      favoriteSuperhero = value['favoriteSuperhero'];
    }
    return configly.get(favoriteSuperhero);
  })
  .then((heroInfo) => {
    console.log("hero stats: ");
    console.log(heroInfo);
  })
  .catch((error) => {
    // Deal with error
  });
```
> Configly requires support for [ES6 Promises](http://caniuse.com/promises). You can [polyfill](https://github.com/jakearchibald/es6-promise)
 if your stack does not support ES6 promises.

## API Reference
### Initialization

Initialize the Configly library via the constructor:

```js
const Configly = require('Configly');
const configly = new Configly('YOUR_API_KEY');
```

You can initialize the library with several options:

```js
const configly = new Configly(API_KEY, {
  enableCache: true,
  timeout: 2000,
  host: 'api.config.ly',
};
```

The `API_KEY` is the only required parameter; you can get it via logging in with your account on the 
[Configly Configulator](https://www.config.ly/config).

#### Options
All options are optional. The options object itself can be omitted.

| Option | Default | Description |
| ----- | ----- | -------- |
| `enableCache` | `true` | Permits you to disable the cache, resulting in an HTTP fetch on every `get()` call |
| `timeout` | 3000 | Timeout for requests to Configly's backend in milliseconds (ms).
| `host` | `'api.config.ly'` | Host that requests are made to

### `get(key, options?)`
The core function of the library is to request values stored in Configly and you do this
via the `get()` method. 

`get()` accepts a string as its first argument&dash;a key. Configly will fetch the corresponding 
value from the Configly servers (or look it up in the local library cache). 
`get()` returns an [ES6 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), 
fulfilled with the value. So, the first value in `get('test_key').then` will be the key's value.

```js
configly.get(key)
  .then((value) => {
    console.log(`${key}'s corresponding value on Configly's server is ${value}`.)
  });
```

This is an async call; it may be lightning fast as the value could be cached. Other times, it will make a server call.
#### Basic example
In the following example, the [Configulator](https://www.config.ly/config) has a value stored for
the key `favorite_games`

```
// This value is stored on the Config.ly servers.
favorite_games = ['factorio', 'dominion', 'counterstrike', 'civ', 'arkham']

```
The JavaScript example client code is:

```js
configly.get('favorite_games')
  .then((games) => {
    // It's good coding practice to code defensively; someone could have changed the value in
    // the Configulator.
    if (!Array.isArray(games)) {
      games = ['factorio', 'counterstrike', 'civ', 'arkham'];
    }

    console.log('The best games!');
    for (let i = 0; i < games.length; i++) {
      console.log(games[i]);
    }
  })
```

#### Parallel calls
`get()` may call the server to fetch a key and you may want to store many values in Configly;
you may want to fetch some of those values in parallel.
Note that `get()` returns an [ES6 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise),
so you can use [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all).

```js
Promise.all([ configly.get('NUM_WEATHER_RETRY_ATTEMPTS'), configly.get('WEATHER_MARKETING_COPY') ])
  .then((numRetries, copy) => {
    // WeatherService is a made up service that returns an ES6 Promise.
    return Promise.all([ WeatherService.getWeather(numRetries), copy ]);
  })
  .then((weather, copy) => {
    // Assumes this method renders an HTML template&mdash;for example like in express.
    res.render('foecast', {
      weatherInfo: weather,
      marketingCopy: copy,
    });
  });
```

#### Options
Like the constructor, `get()` accepts the same set of options that override any default options for that
`get()` call only.

```js
const Configly = require('Configly');
const configly = new Configly(API_KEY, {
  timeout: 1000, 
  enableCache: disable,
};

configly.get('pricing_info', {
  // Because pricing info is so important to our business logic, we're willing
  // to have a longer timeout.
  timeout: 5000, 
}).then((pricingInfo) => {
  // This next `get` call will default to the constructor's `timeout` value (1000).
  return configly.get(pricingInfo['currency']);
});
```
For both calls to `configly.get()` in this example, the cache is disabled.

## License

This repository is published under the [MIT](LICENSE) license.
