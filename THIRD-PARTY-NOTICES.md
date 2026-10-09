# Third-party notices

Parts of this plugin (notably the initial profile tree component) are adapted
from [Eugeny/tabby](https://github.com/Eugeny/tabby), used under the MIT
License:

```
MIT License

Copyright (c) Eugene Pankov and Tabby contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## DOMPurify

The custom SVG icon import feature is sanitized using
[DOMPurify](https://github.com/cure53/DOMPurify) (Cure53 and other
contributors), dual-licensed under the Apache License 2.0 and the Mozilla
Public License 2.0. See the `dompurify` npm package (embedded in this
plugin's bundle) for full license text.

## yaml

The built-in SFTP text editor uses the [`yaml`](https://github.com/eemeli/yaml)
parser and serializer by Eemeli Aro, distributed under this permissive license:

```
Copyright Eemeli Aro <eemeli@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## parse5 and entities

The built-in SFTP text editor uses [parse5](https://github.com/inikulin/parse5)
for HTML validation and formatting, together with its `entities` dependency.
`parse5` is MIT licensed:

```
Copyright (c) 2013-2019 Ivan Nikulin (ifaaan@gmail.com, https://github.com/inikulin)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

`entities` is BSD-2-Clause licensed:

```
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list
of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this
list of conditions and the following disclaimer in the documentation and/or
other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Iconify icon sets (Material Design Icons, Tabler Icons)

The icon picker's search results are sourced, in addition to Font Awesome
(via Tabby's own `icons.json`, see below), from two icon sets distributed in
[Iconify](https://iconify.design) JSON format as the `@iconify-json/mdi` and
`@iconify-json/tabler` npm packages, embedded as static data in this plugin:

- **Material Design Icons** (https://github.com/Templarian/MaterialDesign),
  licensed under the Apache License 2.0.
- **Tabler Icons** (https://github.com/tabler/tabler-icons), licensed under
  the MIT License.

## dashboard-icons (self-hosted service logos)

The icon picker's search results also include
[homarr-labs/dashboard-icons](https://github.com/homarr-labs/dashboard-icons),
licensed under the Apache License 2.0. No npm package exists for this set —
it is vendored straight from the GitHub repository by
`scripts/vendor-dashboard-icons.js` into `src/dashboardIcons.json`, embedded
as static, offline data (no network access at runtime). See
`src/dashboardIcons.PROVENANCE.md` for the exact upstream commit, the size
cap applied, and how to regenerate.

**These files have been modified** (Apache License 2.0, section 4b). The
vendoring script rewrites each SVG once, at generation time, so that it can be
rendered inside a live document without interfering with the rest of the
application: an explicit `fill` is pinned on the root element so host CSS
cannot repaint the artwork, internal `id` attributes and the references to them
are prefixed per icon so gradients and clip paths cannot collide between two
icons shown side by side, and any embedded `<style>` block is scoped to its own
icon, with `@font-face` rules dropped. XML prologs, comments and `<script>`
elements are stripped. A build-time SVGO pass then shortens SVG path commands,
normalizes drawing values to three decimal places and transforms to five; it
leaves IDs, embedded CSS, colors, aliases and variants intact. SVGO itself is a
development tool and is not bundled into the plugin.

The logos and marks depicted by these icons remain the property of their
respective owners; their inclusion here is solely to let a user identify a
self-hosted service by its own logo when naming an SSH profile or folder, not
an endorsement or affiliation of any kind, by either this plugin or the
services depicted.

## Font Awesome icon names (via Tabby)

`src/icons.json` is extracted from Tabby's own `tabby-core` source
(`icons.json`, not published in the npm package — see this plugin's
`tabby_sidebar_roadmap.md`), itself derived from
[Font Awesome Free](https://fontawesome.com) (icons: CC BY 4.0, code: MIT).
This plugin only stores/searches Font Awesome *class name strings* (e.g.
`"fas fa-star"`) that Tabby's own already-bundled Font Awesome font/CSS
renders — no Font Awesome font files or icon glyphs are themselves
redistributed by this plugin.
