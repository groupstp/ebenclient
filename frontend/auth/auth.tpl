<div class="form-signin" id="{{name}}{{_freezePostfix}}">
    <img src='logo.png'>
    <h2 class="form-signin-heading">{{caption}}</h2>
    <div class="row">
        <div class="col-lg-10 col-lg-offset-1  col-sm-12 col-xs-12 text-center">
            <form role="form" id="{{name}}{{_formPostfix}}">
                <div class="input-group form-group">
                        <span class="input-group-addon" style="background-color: #00a23f; color: white"><i
                                class="fa fa-user" aria-hidden="true"></i></span>
                    <input type="text" class="form-control" placeholder="Логин" name="user" required autofocus>
                </div>
                <div class="input-group form-group">
                        <span class="input-group-addon" style="background-color: #00a23f; color: white">
                            <i class="fa fa-unlock-alt" aria-hidden="true" style="margin-right: 2px;"></i></span>
                    <input id='passwordInput' type="password" class="form-control" placeholder="Пароль" name="pswd"
                           required>
                </div>
            </form>
            <div class="panel panel-danger" id="message" hidden>
                <div class="panel-heading">
                    <h3 class="panel-title" id="mes_text"><b>Неверные авторизационные данные!</b></h3>
                </div>
            </div>
            <button id='authButton' class="btn btn-lg btn-success btn-block">
                Войти
            </button>
            {{#if authGoogle}}
                <button class="btn btn-lg btn-success btn-block" id="googleAuth" ng-click="login()" disabled>
                    Войти c помощью <i class="fa fa-google" aria-hidden="true"></i>
                </button>
            {{/if}}
        </div>
        <div class="col-lg-10 col-lg-offset-1 col-sm-12 col-xs-12 text-center" style="margin-top: 3%">
            <span class="badge">{{version}}
            </span>
        </div>
    </div>
</div>