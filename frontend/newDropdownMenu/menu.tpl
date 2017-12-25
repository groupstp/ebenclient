{{#if items}}
    <li class="dropdown" style="cursor: pointer">
        <a class="dropdown-toggle" data-toggle="dropdown">{{title}}
            <b class="caret"></b>
        </a>
        <ul class="dropdown-menu">
            {{#each items}}
            <li id="topMenu_{{../menuKey}}-{{this.key}}" style="cursor: pointer" data-obj="{{../menuKey}}"
                data-name="{{this.key}}" data-caption="{{this.value}}" data-sel=true data-action="getObjForm"><a href = "#objView={{../objView}}&object={{this.key}}">{{this.value}}</a></li>
            {{/each}}
        </ul>
    </li>
{{else}}
    <li id="topMenu_{{menuKey}}" style="cursor: pointer" data-obj="{{menuKey}}" data-caption="{{title}}" data-sel=true data-action="getObjForm"><a>{{title}}</a>
    </li>
{{/if}}