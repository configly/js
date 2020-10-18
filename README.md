# Configly JavaScript library

> [Config.ly](https://www.config.ly) is the right place for software developers to
put their static/config data such as copy, exponential backoff parameters, and styling. It works
on Node.JS and in the browser.

## What is Configly?
[Config.ly](https://www.config.ly) is a read-optimized static-data key/value store API. It's built
for modern development with the aim of being dead simple to use, low-latency, and high-availability.
Config.ly, you can skip slow deploy processes (such as with the iOS App Store) and deploy
changes near instantly; allow marketing to make its own copy changes without asking developers;
and ensure you do not have [data duplicated across clients][https://en.wikipedia.org/wiki/Don%27t_repeat_yourself].

### Core Features

- API to fetch strings, JSON Blobs, booleans, and numbers from the Config.ly backend
- Web interface for modifying these values without having to deploy code (called Configulator).
- High availability, high-throuput. low-latency backend. 
- Smart caching on the client libraries to minimize server requests.

## Getting Started

### Get your access token.
If you do not have an account with [Config.ly](https://www.config.ly), you'll need one (since 
you'll be putting your data there).  Registration is lightning quick - you can get there by 
visiting [https://www.config.ly/signup](https://www.config.ly/signup).

After signing up, you can grab your access token, which you'll need below.

### Library installation

```sh
npm install configly
```

#### For use in browsers
We recommend downloading the SDK via npm and including it on your site for maximum availability.


## Usage
The package needs to be configured with your account's API key, which is available in the 
[Configly Configulator](https://www.config.ly/config)

The golden rule of Config.ly client side apps is: *do NOT* assign the result of a configly.get() 
to a long-lived variable; in order forthe value to fetch from the server, you must call configly.get().


```js
const Configly = require('Configly');
const configly = new Configly('YOUR_API_KEY');

configly.get('your_key_of_choice').then((value) => console.log(value));
```

### Using Promises
Configly's `get` returns a chainable promise which can be used instead of a regular callback:

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

## API Documentation & Reference
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

The `API_KEY` is required; you can get it via logging in with your account on the 
[Configly Configulator](https://www.config.ly/config).

#### Options

| Option | Default | Description |
| ----- | ----- | -------- |
| enableCache | `true` | Permits you to disable the cache, resulting in an HTTP fetch on every `get` call |
| timeout | 3000 | The millisecond (ms) timeout for requests to Config.ly's backend.
| host | `'api.config.ly'` | Host that requests are made to

### Get
The core function of the library is to request values stored in Configly and you do this
via the `get` method. This is an async call; it may be lightning fast as the
value could be cached. Other times, it will make a server call.

#### Basic example
In the following example, the [Configulator](https://www.config.ly/config) has the key:values of:

```
favorite_games: ['factorio', 'dominion', 'counterstrike', 'civ', 'arkham']

```

```js
configly.get('favorite_games')
  .then((games) => {
    // It's good coding practice to code defensively
    if (!Array.isAray(games)) {
      games =['factorio', 'counterstrike', 'civ', 'arkham'];
    }

    for (let i = 0; i < games.length; i++) {
      console.log(games[i]);
    }
  })
```

#### Parallel calls
Because `get` may call the server to fetch a key, you may want to fetch many values in parallel.
Note that `get` returns an [ES6 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise),
so you can use [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all).

```js
Promise.all([configly.get('POLLING_FREQUENCY'), configly.get('MARKETING_COPY')])
  .then((numRetries, copy) => {
    // a made up service that returns a promise.
    return Promise.all([ WeatherService.getWeather(numRetries), copy]);
  })
  .then((weather, copy) => {
    // assumes this method renders an HTML tempalte. 
    res.render('foecast', {
      weatherInfo: weather,
      marketingCopy: copy,
    });
  });
```

#### Options
Like the constructor, `get` accepts the same set of options that override any defaults for that
`get` call only.

```js
const Configly = require('Configly');
const configly = new Configly(API_KEY, {
  timeout: 1000, 
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

### Promises
axios depends on a native ES6 Promise implementation to be [supported](http://caniuse.com/promises).
If your environment doesn't support ES6 Promises, you can [polyfill](https://github.com/jakearchibald/es6-promise).

## License

This repository is published under the [MIT](LICENSE) license.
