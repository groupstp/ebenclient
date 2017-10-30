<ul>
  {{#each possibleObjViews}}
    <li class = "objViewElement" data-objView = "{{this}}">{{this}}</li>
  {{else}}
    <li>Список пуст</li>
  {{/each}}
</ul>