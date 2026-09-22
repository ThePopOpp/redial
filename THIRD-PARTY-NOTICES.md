# Third-party source notices

The shared form components follow shadcn/ui's documented Radix composition patterns, with Redial-authored CSS tokens and wrappers. See [date-picker composition](https://ui.shadcn.com/docs/components/radix/date-picker) and [Next.js theme setup](https://ui.shadcn.com/docs/dark-mode/next). Installed Radix UI, React DayPicker and next-themes packages retain their upstream MIT licenses in `node_modules`.

The landing scene imports Three.js 0.186.0 and its CSS3DRenderer addon from the installed package (MIT; copyright © 2010–2026 three.js authors). The complete upstream license is retained at `node_modules/three/LICENSE`. Phone geometry and Redial scene/UI assets are authored in this repository. No external 3D asset or source-company code was copied.

`src/components/ui/button.tsx` adapts the official [shadcn/ui Button](https://github.com/shadcn-ui/ui/blob/a87a63b2ca25143d26c8bd0903e4e9bc77b3f824/apps/v4/registry/new-york-v4/ui/button.tsx), revision `a87a63b2ca25143d26c8bd0903e4e9bc77b3f824`. Adaptations: local cn utility, direct Radix Slot package, two required variants, 44px minimum targets and Redial semantic colors. No code from the two business reference repositories was imported. Font packages retain their own OFL notices in node_modules; other installed packages retain their package licenses.

MIT License

Copyright (c) 2023 shadcn

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
