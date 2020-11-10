# Configly JavaScript library
> The Node.JS and JavaScript library for [Configly](https://www.config.ly): the modern config/static data key/value store that's updatable through a fancy web UI.

![npm](https://img.shields.io/npm/v/configly-js)
[![Coverage Status](https://coveralls.io/repos/github/configly/js/badge.svg)](https://coveralls.io/github/configly/js)
[![Try on RunKit](https://badge.runkitcdn.com/configly-js.svg)](https://runkit.com/npm/configly-js)
![GitHub](https://img.shields.io/github/license/configly/js)

Table of Contents
=================

  * [What is Configly?](#what-is-configly)
      * [Core Features](#core-features)
      * [Concepts / Data Model](#concepts---data-model)
        * [Types](#types)
  * [Getting Started](#getting-started)
    * [1. Get your API Key](#1get-your-api-key)
    * [2. Create your first Config](#2-create-your-first-config)
    * [3. Install the client library](#3-install-the-client-library)
    * [4. Fetch the Config](#4-fetch-the-config)
    * [For use in browsers](#for-use-in-browsers)
  * [Usage](#usage)
     * [Using Promises](#using-promises)
  * [API Reference](#api-reference)
     * [Initialization/`init()`](#initialization)
        * [Options](#options)
        * [Errors](#errors)
     * [`getInstance()`](#-getinstance---)
     * [`get(key, options?)`](#getapi_key-options)
        * [Basic example](#basic-example)
        * [Unknown keys](#unknown-keys)
        * [Parallel calls](#parallel-calls)
        * [Options](#options-1)
        * [Errors](#errors-1)
  * [License](#license)


## What is Configly?

[Configly](https://www.config.ly) is the place software developers put their static / config data&mdash;like copy, styling, and minor configuration values.
They can then update that data directly from [https://www.config.ly/config](https://www.config.ly/config)
without having to wait for a deploy process app store review. Their app or webapp receives the data near instantly.
Non-technical folks themselves can publish changes freeing developers to focus on hard software problems and not copy tweaks.

On the backend, [Configly](https://www.config.ly) provides a read-optimized static-data key/value store built
with the aim of being low-latency, and high-availability. The client libraries are made to be dead-simple, lean, and efficient
(via enhancements like caching). There is a fancy [web UI called the Configulator](https://config.ly/config)
for setting and updating the configs as well as seeing things like change history.

There are a host of other benefits to using Configly (such as ensuring you do not have [data duplicated across clients](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself), reducing load on your primary DB, and providing better tolerance for traffic spikes),
read more about the benefits at [Configly](https://www.config.ly).

### Core Features

- API to fetch Strings, JSON Blobs (arrays and objects), Booleans, and Numbers from the Configly backend
- [Web interface](https://www.config.ly/config) for modifying these values without having to deploy code (we call our beloved web interface _the Configulator_).
- High availability, high-throughput, low-latency backend.
- Smart caching on the client libraries to minimize server requests.
- Client libraries available in an expanding amount of languages.

### Concepts / Data Model

- A Configly account contains a set of *Configs*.
- A *Config* is a key-value pair along with associated metadata (like TTL).
- The keys are strings.
- The values are one of the following types:

#### Types

| Type    |  notes   | Example(s)|
|---------|----------|----------|
| string  |          | "I <3 Configly!" |
| number  | Can be integers or decimal; _be aware some clients require you to specify which when fetching_  | 31337, 1.618 |
| boolean | only true or false | true, false |
| jsonBlob | A [JSON5](https://json5.org/) (more relaxed JSON) array or object. | ``` ["one", 5, true]```, ```{"text": "Buy now!", color: "#0F0"}``` |

##### More `jsonBlob` examples
You can make arbitrarily complex JSON structures -- _as long_ as the top level is
an object or array. This is incredibly powerful as you can send a host of data
with a single _config_:


A more complex array for a store inventory. Note that because we're using JSON5, quotes
are optional for single words.
```js
[
  "Simple T-shirt",
  "Basic hoodie",
  {
    item: "Complex T-shirt",
    sizes: ['S', 'M', 'L'],
    price_us_cents: [1099, 1499, 1599],
  }
]
```

And a more complex object showing how you can internationalize and set style:
```js
{
  "welcome_message": {
    copy: {
      'en': 'Welcome!',
      'es': "¡Bienvenidos!",
    }, style: {
      color: '#0F0',
      fontWeight: '700',
    }
  },
  "buy_button" : {
    copy: {
      'en': 'Buy',
      'es': "Comprar",
    }, style: {
      backgroundColor: "#F00",
      border: "border-radius 10px",
    }
  }
}
```

## Getting Started

In four easy steps!

### 1. Get your API Key
You'll need a [Configly](https://www.config.ly) account. Registration is lightning quick&mdash;you can register via
visiting [https://www.config.ly/signup](https://www.config.ly/signup).

After signing up, you can grab your API Key from [https://www.config.ly/config](https://www.config.ly/config).
You'll need your API Key below to integrate the library into your app.

### 2. Create your first Config
From [https://www.config.ly/config](https://www.config.ly/config), create a new Config via the "Add" button:
![image](https://user-images.githubusercontent.com/184923/98487495-3b42ca80-21f1-11eb-9bfc-bfd429733362.png)

Consider creating a simple `JSON Object or Array` Config called `greetings` and give it the value of:
`['hello', 'hola', '你好', 'नमस्ते']`:

[https://www.config.ly/config](https://www.config.ly/config) should look like this:

![image](https://user-images.githubusercontent.com/184923/98494454-09d6f880-220b-11eb-9ef7-36709ddc129f.png)

Be sure to save via clicking 'Send to Clients'. Now, we'll write client code to fetch this key.


### 3. Install the client library

In a new folder, run:

```sh
npm install configly-js
```

### 4. Fetch the Config
In that same folder, create a JavaScript file with the following content:
```js
const API_KEY = 'YOUR_API_KEY';
const Configly = require('configly-js');
const configly = Configly.init(API_KEY);

(async () => {
  try {
    const greetings = await configly.get('greetings');
    if (!greetings) {
      console.log("Cannot find key on Configly's server! Wrong API Key?");
      return;
    }
    console.log("To you, Config.ly says:");
    greetings.forEach( (v) => console.log(v) );

  } catch (error) {
    const { status, message, originalError } = error;
    console.log(`Sorry something went wrong: ${status}: ${message}`);
  }
})();
```

Run that file via ```node file.js``` and you should see the payload printed! Try changing
some values on [https://www.config.ly/config](https://www.config.ly/config) to confirm that
the client is getting the updates.

Congratulations you have Configly working end-to-end! Now, feel free to use Configly with all your projects!

#### For use in browsers
We recommend downloading the SDK via npm and including it on your site for maximum availability.


## Usage
> The golden rule of Configly library use is: **do NOT** assign the result of a `get()`
to a long-lived variable; in order to check for new values from the server, you must call `get()`.

The package needs to be configured with your account's API key, which is available in the
[Configly Configulator](https://config.ly/config)

```
// This value is stored on the Config.ly servers.
store_catalog:
 {
   has_sale: true,
   discount: 0.8,
   items: ['T Shirt', 'Hoodie', 'Ferrari'],
   price: [ 100, 250,  200000],
 }
```
On the Node.JS / JavaScript client:

> You can run this code as-is since it uses our demo code. 
```js
const API_KEY = 'Dem0apiKEY'; // This is our demo API Key.
const Configly = require('configly-js');
const configly = Configly.init(API_KEY);

(async () => {
  try {
    const params = await configly.get('store_catalog');
    if (!params) {
      console.log("Cannot find store_params on Configly's server! Wrong API Key?");
      return;
    }

    let { has_sale, discount, items, prices } = params;
    if (has_sale) {
      prices =  prices.map((price) => price*discount);
    }

    items.forEach( (_, i) => {
      console.log(`${items[i]}: ${prices[i]} USD`);
    });

  } catch (error) {
    const { status, message, originalError } = error;
    console.log(`Sorry something went wrong: ${status}: ${message}`);
    // You may want to submit error to any error reporting service you use like Sentry
    // originalError shows the error the Configly library caught, if any, and can help you investigate.
  }
})();

```

### Using Promises
Configly's `get()` returns a chainable promise which can be used instead of a regular callback:

> You can run this code as-is since it uses our demo code. 
```js
const Configly = require('configly-js');
const configly = Configly.init('Dem0apiKEY'); // This uses our demo API Key.

let favoriteSuperhero = 'Batman';
configly.get('the_best_superhero')
  .then((value) => {
    if (value != undefined) {
      favoriteSuperhero = value;
    }
    return configly.get(favoriteSuperhero);
  })
  .then((heroInfo) => {
    console.log("hero stats for " + favoriteSuperhero + ":");
    console.log(heroInfo);
  })
  .catch((error) => {
    const { status, message, originalError } = error;
    console.log(`sorry something went wrong: ${status}: ${message}`);
    // Deal with error
  });

```
> Configly requires support for [ES6 Promises](http://caniuse.com/promises). You can [polyfill](https://github.com/jakearchibald/es6-promise)
 if your stack does not support ES6 promises.

## API Reference
### Initialization

The library uses the [Singleton Pattern](https://en.wikipedia.org/wiki/Singleton_pattern); you
*should not* create a new instance via the constructor.

Initialize the Configly library via the `init()` static method, which returns the global instance:

```js
const Configly = require('configly-js');
const configly = Configly.init('YOUR_API_KEY');
```

You can initialize the library with several options:

```js
const configly = Configly.init(API_KEY, {
  enableCache: true,
  timeout: 2000,
  host: 'https://api.config.ly',
});
```

The `API_KEY` is the only required parameter; you can get it via logging in with your account on the
[Configly Configulator](https://config.ly/config).

#### Options
All options are optional. The `options` object itself can be omitted.

| Option | Default | Description |
| ----- | ----- | -------- |
| `enableCache` | `true` | Permits you to disable the cache, resulting in an HTTP fetch on every `get()` call |
| `timeout` | 3000 | Timeout for requests to Configly's backend in milliseconds (ms).
| `host` | `'https://api.config.ly'` | Host that requests are made to

#### Errors
The `init()` method throws an `Error` if the API key is not supplied or if it is called
multiple times. The method does NOT check for validity of the key; that happens on each `get()`
request. See: [`get() errors`](#errors-1)


### `getInstance()`

To access the global instance, you can call `getInstance()`. You *must* call `init()` first.
```js
// Perhaps this line is some initialization code in a seprate file such as
// 'app.js'
Configly.init(API_KEY);

// And perhaps this line is in a separate file like 'routes.js'
const getIndex = async (req, res) => {
  let tagLine = await Configly.getInstance().get('marketing_tag_line');
  res.render('marketing_splash', { tagLine });
};
```

### `get(key, options?)`
`get()` exposes the core function of the library; is to request values stored in Configly.

`get()` accepts a string as its first argument&dash;a key. Configly will fetch the corresponding
value from the Configly servers (or look it up in the local library cache).
`get()` returns an [ES6 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise),
fulfilled with the value. So, the first value passed to `get('test_key').then()` will be the key's value.

```js
Configly.getInstance().get(key)
  .then((value) => {
    console.log(`${key}'s corresponding value on Configly's server is ${value}.`)
  });
```

This is an async call; sometimes it will be lightning fast as the value could be cached. Other times, it will make a (fast) server call to fetch the value.

#### Basic example
In the following example, the [Configulator](https://config.ly/config) has a JSON string array stored with
the key `favorite_games`

```js
// This value is stored on the Config.ly servers.
product_info: {
  name: "Factorio",
  description: {
    en: "Factorio is a game in which you build and maintain factories",
    es: "Factorio es un videojuego en cual construyes y mantienes fábricas",
    cn: "Factorio是一款视频游戏，您可以在其中建立和维护工厂。"
  }
}

```
The JavaScript client code:

```js
async getLandingPageData = (user) => {
  // The internet is inherently unreliable.
  // It's not a bad idea to have defaults juuust in case
  const defaultValue = {
    name: "Factorio",
    description: "Literally the best game you've ever played",
  };

  try {
    const productInfo = await Configly.getInstance().get('product_info');

    // This means no value for the key was found. Perhaps the wrong API key was used?
    if (!productInfo) {
      return defaultValue;
    }

    const { name, description } = productInfo;
    const language = user.getLanguage();
    return {
      name: name,
      description: description[language],
    }
  } catch ({ status, message }) {
    console.log(`Error fetching product_info: ${status}: ${message}`);
    return defaultValue;
  }
}
```
#### Unknown keys
When `get()` encounters a key it could not find, it return the value `undefined`.

#### Parallel calls
You may want to fetch multiple values. Because `get()` sometimes makes a server call,
in the worst case, this would mean multiple server calls. To be safe, you should execute the calls
in parallel.
Note that `get()` returns an [ES6 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise),
so you can use [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all).

```js
const configly = Configly.getInstance();

Promise.all([ configly.get('NUM_WEATHER_RETRY_ATTEMPTS'), configly.get('WEATHER_MARKETING_COPY') ])
  .then(([numRetries, copy]) => {
    // WeatherService is a made up service that returns an ES6 Promise.
    return Promise.all([ WeatherService.getWeather(numRetries), copy ]);
  })
  .then(([weather, copy]) => {
    // Assumes this method renders an HTML template&mdash;for example like in express.
    res.render('foecast', {
      weatherInfo: weather,
      marketingCopy: copy,
    });
  });
```

#### Options
Like the constructor, `get()` accepts the same set of `options` that override any global `options` for that
`get()` call only.

```js
const Configly = require('Configly');
const configly = Configly.init(API_KEY, {
  timeout: 1000,
  enableCache: false,
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
For both calls to `configly.get()` in this example, the cache is disabled. But only the first call
has a timeout of 5000 ms; the second call uses the global setting of 1000 ms.

#### Errors
Note that when `get()` encounters a key it could not find, it return the value `undefined`; this case is not treated as an error.

When there is an error,`get()` returns a rejected promise fulfilled with an object with the following properties

  - `status`: the error name
     You can see the potential values in the `Configly.ERRORS` object.
  - `message`: text description of the error. Hopefully it's helpful!
  - `originalError`: the originating JavaScript `Error` object

##### Error `status`es
The potential values for the `status` key of the error returned via `get` (i.e. `get(key).catch(error)`) are:

| Key   | Explanation  |
| ----- | -------- |
| `INVALID_API_KEY` | Configly's server returned a 401. This likely means the `API Key` supplied in `init()` is incorrect. You can see your API Key in the [https://config.ly/config](Configluator). |
| `CONNECTION_ERROR` | There was a problem communicating with the Config.ly backend. This could be due to a network fault or bad internet connection. Try again later. If the problem persists [let us know](https://config.ly/contact)! |
| `OTHER` | A miscellaneous error. Take a look at the `originalError` value inside the returned object. This could indicate a problem with the library; if so, you can create a [Github issue](https://github.com/configly/js/issues) and we'll look into it. |

These values can be referenced via `Configly.ERRORS`. e.g. `Configly.ERRORS.INVALID_API_KEY`.
##### Example error handling code

```js
Configly.getInstance().get('best_star_wars_movie')
  .then((movie) => {
    doSomethingMagical(movie);
  }).catch((error) => {
    if (error.status == 'CONNECTION_ERROR') {
      // Place retry code here
    } else {
      console.log(error.status, error.message, error.originalError);
    }
  });
```

or with the [alternative asynchronous syntax `async/await`](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await):

```js
const doMovieMagic = async () => {
  try {
    const movie = await Configly.getInstance().get('best_star_wars_movie');
    doSomethingMagical(movie);
  } catch (error) {
    if (error.status == 'CONNECTION_ERROR') {
      // Place retry code here
    } else {
      console.log([error.status, error.message, error.originalError]);
    }
  }
};
```

## License

This repository is published under the [MIT](LICENSE.md) license.
