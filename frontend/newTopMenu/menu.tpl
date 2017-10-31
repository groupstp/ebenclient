<!-- Fixed navbar -->
<div class="navbar navbar-default navbar-fixed-top" role="navigation">
    <div class="container-fluid">
        <div class="navbar-header">
            <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
                <span class="sr-only">Toggle navigation</span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
                <span class="icon-bar"></span>
            </button>
            <a class="navbar-brand" style="cursor: pointer" data-obj="main" data-sel=false data-cl=true>{{name}}</a>
        </div>
        <div class="navbar-collapse collapse">
            <ul class="nav navbar-nav" id = "dropdown-menus">

            </ul>
            <ul class="nav navbar-nav navbar-right">
                <li data-obj='user' data-sel=false data-cl=true>
                    <a>
                        <span class="glyphicon glyphicon-user" style="color: #43a047"></span> {{user}}
                    </a>
                </li>
                <li style="cursor: pointer" data-obj='exit' data-sel=false data-cl=true>
                    <a>Выход
                        <span class="glyphicon glyphicon-log-out"
                              style="color: #43a047;"></span>
                    </a>
                </li>

            </ul>
        </div><!--/.nav-collapse -->
    </div>
</div>