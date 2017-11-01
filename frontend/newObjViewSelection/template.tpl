<div class = "objViews">
    <p class = "objViews-title"> Предметные области: </p>
    <ul class="objViews-list">
        {{#each objViews}}
        <li class="objViews-list-element" data-name = "{{this}}">
            {{this}}
        </li>
        {{/each}}
    </ul>
</div>
