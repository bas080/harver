# Harver

## Getting Started

First I want to run the code to make sure that the explanation of the software
and my idea of it matches the result of running the software.

```js tee init.js format.js > /dev/null
let { writeFile } = require('fs');
let { join } = require('path');
let request = require('request');
let blend = require('@mapbox/blend');
let argv = require('minimist')(process.argv.slice(2));
let {
  greeting = 'Hello',
  who = 'You',
  width = 400,
  height = 500,
  color = 'Pink',
  size = 100,
} = argv;
let firstReq = {
  // https://cataas.com/cat/says/Hi%20There?width=500&amp;height=800&amp;c=Cyan&amp;s=150
  url: 'https://cataas.com/cat/says/' + greeting + '?width=' + width + '&height=' + height + '&color' + color + '&s=' + size,
  encoding: 'binary'
};
let secondReq = {
  url: 'https://cataas.com/cat/says/' + who + '?width=' + width + '&height=' + height + '&color' + color + '&s=' + size,
  encoding: 'binary'
};
request.get(firstReq, (err, res, firstBody) => {
  if(err) {
    console.log(err);
    return;
  }
  console.log('Received response with status:' + res.statusCode);
  request.get(secondReq, (err, res, secondBody) => {
    if(err) {
      console.log(err);
      return;
    }
    console.log('Received response with status:' + res.statusCode);
    blend([ {
      buffer: new Buffer(firstBody, 'binary'),
      x: 0,
      y:0,
    }, {
      buffer: new Buffer(secondBody, 'binary'),
      x: width,
      y: 0,
    }], {
      width: width * 2,
      height: height,
      format: 'jpeg',
    }, (err, data) => {
      const fileOut = join(process.cwd(), `/cat-card.jpg`);
      writeFile(fileOut, data, 'binary', (err) => {
        if(err) {
          console.log(err);
          return;
        }
        console.log("The file was saved!");
      });
    });
  });
});
```

First I'll improve readability a bit by running standard.

```bash bash || true 2>&1
npx standard --fix format.js
```
```
  /home/ant/projects/harver/format.js:36:15: 'new Buffer()' was deprecated since v6.0.0. Use 'Buffer.alloc()' or 'Buffer.from()' instead.
  /home/ant/projects/harver/format.js:40:15: 'new Buffer()' was deprecated since v6.0.0. Use 'Buffer.alloc()' or 'Buffer.from()' instead.
  /home/ant/projects/harver/format.js:47:8: Expected error to be handled.
```

We also need to pull in some dependencies that are not shipped with node.

```bash bash
node --version
npm --version
```
```
v16.11.0
8.0.0
```

We'll use npm to start a project and define the remote dependencies.

```json cat - > package.json
{
  "name": "Harver",
  "type": "module",
  "version": "0.0.0",
  "description": "Harver task",
  "bin": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Bas Huis"
}
```

```bash bash
npm install minimist --no-save
npm install @mapbox/blend --save
```
```

added 1 package, removed 67 packages, and audited 2 packages in 642ms

found 0 vulnerabilities

added 63 packages, removed 1 package, and audited 64 packages in 17s

3 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

While I'm at it; I also want to use git to keep track of my changes.

```bash test ! -d .git || rm -rf .git && bash
git init
git remote add origin git@github.com:bas080/harver.git
echo 'node_modules/' > .gitignore
```
```
Initialized empty Git repository in /home/ant/projects/harver/.git/
```

Let's see what happens if we run the script that was given to me.

```bash test -f "cat-card.jpg" || bash
node init.js
```

![Kitties](cat-card.jpg)

That's cute!

> So the description matches both my expectations and the result of running the
> process.

So now we'll look at the other requirements.

## Requirements

- Simplicity (less is more!)
- Maintainability
- Performance

Where to start? Let's tackle each of these points in the following sections.

### Simplicity

Less is more can mean different things.

- Less dependencies.
- Less code.
- Less complexity (things and moving parts).

Looking at the code I do notice some repetition. Solving that is doable. The
dependencies seem fine though. I won't be cutting down on the dependencies. The
complexity is also low. The lack of abstractions makes it easier for people
that are not familiar with the language (ecosystem) to understand and
contribute to it. I'll try to keep that going during the refactor.

### Maintainability

Maintainability is a broad subject which won't come to fruition in a project
of this scope and complexity. However, I'll focus on the function signatures
and testing the desired features. Although request is still maintained, it does
say that it has been deprecated. I might look for a library to replace it.
Something like https://www.npmjs.com/package/node-fetch#buffer seems a good
alternative.

### Performance

I do see a potential gain in performance. I would have to read a bit more
source code of the `request` lib to know how it manages the callbacks before
I can judge how big of a performance gain can be obtained. Ideally I would
write a test to compare performance.

Before I get started with my refactor, I'll first push the current changes.

```bash bash
git add init.js format.js cat-card.jpg package.json package-lock.json .gitignore
git commit -m "Initiate project with first script"
```
```
[master (root-commit) 584054a] Initiate project with first script
 6 files changed, 1176 insertions(+)
 create mode 100644 .gitignore
 create mode 100644 cat-card.jpg
 create mode 100644 format.js
 create mode 100644 init.js
 create mode 100644 package-lock.json
 create mode 100644 package.json
```

## Refactor

First we get rid of the deprecated `request` dependency and instead use
[node-fetch][1]. This library is great because it offers a buffer which is what
the blend function wants.

```bash bash
npm uninstall request --save
npm i node-fetch --save
```
```

up to date, audited 64 packages in 585ms

3 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

added 4 packages, and audited 68 packages in 651ms

5 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

Let's start with the importing of dependencies.

```js memplate import-dependencies
import blend from '@mapbox/blend'
import fetch from 'node-fetch'
import minimist from 'minimist'
import {join} from 'path'
import {promises as fs} from 'fs'
```

Parsing command line arguments:

```js memplate parse-command-line-arguments
const argv = {
  output: 'cat.jpg',
  greeting: 'Hello',
  who: 'You',
  width: 400,
  height: 500,
  color: 'Pink',
  size: 100,
  ...minimist(process.argv.slice(2))
}
```

Making the URL using the url module:

```js memplate make-caas-url
import {URL} from 'url'

function caasURLString({says, width, height, color, size}) {
  const url = new URL(`/cat/says/${encodeURIComponent(says)}`, 'https://cataas.com')

  url.search = new URLSearchParams({
    width, height, color,
    s: size
  })

  return url.toString()
}
```

So let's convert the callback friendly blend to a promise friendly blend using
the `util.promisify`.

```js memplate promisify-blend
import {promisify} from 'util'

const pBlend = promisify(blend)
```

Now for the fetching and blending part. We have not done anything async up till
now. We'll be modern and use async await for this part.

```js memplate fetch-and-blend-images
const main = async (argv) => {
  const { height, width, who, greeting, output } = argv
  const fileOut = join(process.cwd(), output)

  const images = await Promise.all([
    fetch(caasURLString({ ...argv, says: greeting })).then(x => x.buffer()),
    fetch(caasURLString({ ...argv, says: who })).then(x => x.buffer())
  ])

  const data = await pBlend([{
    buffer: images[0],
    x: 0,
    y: 0
  }, {
    buffer: images[1],
    x: width,
    y: 0
  }], {
    width: width * 2,
    height: height,
    format: 'jpeg'
  })

  await fs.writeFile(fileOut, data, 'binary')

  console.log(fileOut)
}

main(argv)
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
```

So I haven't changed much besides using the node-fetch, promisify and making
sure the process exits non zero when one of the async steps fail.


Now we'll join all these code blocks together into a file named `index.js`.

```js memplate > index.js
#!/usr/bin/env node

<import-dependencies
<parse-command-line-arguments
<make-caas-url
<promisify-blend
<fetch-and-blend-images
```

We also format the file using standard.

```bash bash
npx standard --fix index.js
```

> A nicety is to define a shebang line with the interpreter defined. This allows
> for one to make the file executable and be able to run the file without having
> to define the interpreter at the time of running.

Let's test some cases.

```bash bash 2>&1
set -e

./index.js --greeting 'hello' --who 'darkness' --output test.jpg

file test.jpg

# Noticed that escaping does not help. The endpoint will still respond with
# status code 404. Great for testing the exit code.
./index.js --greeting 'dev/null' --output /dev/null || test $? -ne 0
```
```
(node:25537) ExperimentalWarning: stream/web is an experimental feature. This feature could change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
/home/ant/projects/harver/test.jpg
test.jpg: JPEG image data, JFIF standard 1.01, aspect ratio, density 1x1, segment length 16, baseline, precision 8, 800x500, frames 3
(node:25550) ExperimentalWarning: stream/web is an experimental feature. This feature could change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
[Error: image_reader: can't determine type from input data]
```

> I have noticed some warning but I'm fine with using experimental features.
> I assume that node-fetch will keep supporting the buffer function.


If we wish to distribute this script, we could do several things. One is to
host it on some node repository and define a `bin` property in the
package.json. Another is to bundle/build it and distribute the build as
a "standalone"-ish thing. I won't go into that but I guess roll-up could do the
job.

Before saying goodbye I'll commit the changes.

```bash bash
./index.js --greeting "Bye Bye" --who "You" --output bye.jpg
git add index.js bye.jpg package.json package-lock.json
git commit -m "Refactor the initial code"
git log
git push -u origin master -f
```
```
/home/ant/projects/harver/bye.jpg
[master a217eab] Refactor the initial code
 4 files changed, 151 insertions(+), 2 deletions(-)
 create mode 100644 bye.jpg
 create mode 100755 index.js
commit a217eabced7eb81026670f9a24039b05ef13e715
Author: Bas Huis <bas080@hotmail.com>
Date:   Mon Oct 11 23:12:27 2021 +0200

    Refactor the initial code

commit 584054ad141697934c9af423564fb1bb93c5c982
Author: Bas Huis <bas080@hotmail.com>
Date:   Mon Oct 11 23:12:22 2021 +0200

    Initiate project with first script
Branch 'master' set up to track remote branch 'master' from 'origin'.
```

![Bye Kitties](bye.jpg)

Kind Regards,
Bas Huis.

[1]:https://www.npmjs.com/package/node-fetch
