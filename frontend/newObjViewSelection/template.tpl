<h1> Выберите предметную область </h1>
<ul class="objViews">
    {{#each objViews}}
    <li class="objViewsElement" data-name = "{{this}}">
        {{this}}
    </li>
    {{/each}}
</ul>