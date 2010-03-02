function WebViewAssistant(url) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
  this.url = url
}

WebViewAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
  this.controller.setupWidget("web-view",
    this.attributes =
    {
      url: this.url
    },
    this.model =
    {
    });

    this.controller.setupWidget("load-progress",
    this.attributes =
    {
      title: 'Loading...',
    },
    this.progress_model =
    {
      value: 0,
      image: "images/icon.png"
    });
      
  this.webview_model =
  {
    visible: true,
    label: $L('webview_nav'),
    id: "webview_button",
  items:
    [
      {icon: "back", command: 'back'},
      {icon: "refresh", command: 'refresh'},
      {icon: "forward", command: 'forward'}
   ]
  };
  this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.webview_model);
  this.started = this.started.bindAsEventListener(this);
  this.progress = this.progress.bindAsEventListener(this);
  this.stopped = this.stopped.bindAsEventListener(this);
  Mojo.Event.listen(this.controller.get('web-view'), Mojo.Event.webViewLoadStarted, this.started);
  Mojo.Event.listen(this.controller.get('web-view'), Mojo.Event.webViewLoadProgress, this.progress);
  Mojo.Event.listen(this.controller.get('web-view'), Mojo.Event.webViewLoadStopped, this.stopped);
  Mojo.Event.listen(this.controller.get('web-view'), Mojo.Event.webViewLoadFailed, this.stopped);
}

WebViewAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


WebViewAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

WebViewAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
  Mojo.Event.stopListening(this.controller.get('web-view'), Mojo.Event.webViewLoadProgress, this.progress);
  Mojo.Event.stopListening(this.controller.get('web-view'), Mojo.Event.webViewLoadStarted, this.started);
  Mojo.Event.stopListening(this.controller.get('web-view'), Mojo.Event.webViewLoadStopped, this.stopped);
  Mojo.Event.stopListening(this.controller.get('web-view'), Mojo.Event.webViewLoadFailed, this.stopped);
}
WebViewAssistant.prototype.handleCommand = function(event) {
  
  if(event.type == Mojo.Event.command)
  {
    switch(event.command)
    {
      case "refresh":
        this.controller.get("web-view").mojo.reloadPage();
        break;
      case "back":
        this.controller.get("web-view").mojo.goBack();
        break;
      case "forward":
        this.controller.get("web-view").mojo.goForward();
        break;
      case Mojo.Menu.helpCmd:
        this.controller.stageController.pushAppSupportInfoScene();
        break;
      case Mojo.Menu.prefsCmd:
        this.controller.stageController.pushScene("Preferences");
        break;
      case Mojo.Menu.copyCmd:
        this.controller.stageController.setClipboard(this.url, true);
        var banner_text = "Copied " + this.url + " to clipboard";
        Mojo.Controller.getAppController().showBanner(banner_text,{source: 'notification'});

        break
    }
  }
  else if (event.type === Mojo.Event.commandEnable &&
            (event.command === Mojo.Menu.helpCmd || event.command === Mojo.Menu.prefsCmd || event.command === Mojo.Menu.copyCmd))
  {
    event.stopPropagation();
  }
}

WebViewAssistant.prototype.started = function(event)
{
  this.controller.get("load-progress").show();
  this.progress_model.value = 0;
  this.controller.modelChanged(this.progress_model, this);
}
WebViewAssistant.prototype.progress = function(event)
{
  var progress_pct = event.progress * .01;
  this.progress_model.value = (event.progress * .01);
  this.controller.modelChanged(this.progress_model, this);
}
WebViewAssistant.prototype.stopped = function(event)
{
  if(this.controller.get("load-progress"))
    this.controller.get("load-progress").hide();
}
