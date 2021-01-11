Handybars
===

A micro templating engine inspired by Handlebars, but with several notable changes designed to make it more versatile and significantly smaller. Handybars is _not_ Handlebars compatible and cannot be used as a drop in replacement, but the syntax is very similar.

Note, this project is very much a work in progress, the api and behavior can and will change.

### How Handybars Differs from Handlebars

- Handybars is interpreted, not compiled (for now).
- Each template maintains its own environment scope, there is no global scope for all templates.
- There are no explicit helpers or partials, any function or partial in the template or environment scope can be invoked as a helper.
  - Use `handybars.partial(templateText)` (or `import { partial } from 'handybars'`) to parse a partial template.
  - Use `template.setPartial(name, templateText)` to add a partial to a template's environment scope.
- There is currently no support for inline partials.
- `../` does not exist. Instead, use `@parent.` to access the previous scope. However, you may find you don't need this unless a local scope's keys collide with a parent scope's keys.
- There is no built in whitespace control
- Handybars does not support the `as` syntax, such as `{{#each users as | user |}}`
- `{{#each}}` can iterate any Array, Set, Map or plain Object.
- Blocks may contain arrays: `{{#each [ '1st' '2nd' '3rd' ]}}`
- Blocks support inline value lookups: `{{order[request.id].creationDate}}`
- Blocks do NOT support the `value.[N]` lookup syntax (note the period before the bracket)
- The options object passed to helpers has a different structure.

### Usage

```
npm install handybars
```

### Usage

In CommonJS:

```js
const handybars = require('handybars');
```

In ES6:

```js
import handybars from 'handybars';
```

Usage:

```js
const template = handybars("<p>{{author.first}} {{author.last}}</p>");
const html = template({
	author: {
		first: 'John',
		last: 'Doe',
	}
});
```

Any property can be used as a boolean truthy check.

```js
handybars(`
	<div class="entry">
	<h1>{{book.title}}</h1>
	{{#author}}<h2>{{book.author.first}} {{book.author.last}}</h2>{{/author}}
	</div>
`)({
	book: {
		title: 'Mort'
		author: {
			first: 'Terry',
			last: 'Pratchett',
		}
	}
})
```

Any property that is a function will be executed as a helper.

```js
handybars(`
	{{lcase "HELLO"}}
`)({
	lcase: (s) => s.toLowerCase(),
})
```

Arrays can be created inline in logic blocks

```js
handybars(`
	{{#each [ '1st' 2 third ]}}
`)({
	third: '3rd'
})
```