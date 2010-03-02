function PreferencesAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

PreferencesAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
  this.controller.setupWidget("user_id",
    this.attributes =
    {
      textCase: Mojo.Widget.steModeLowerCase
    },
    this.model =
    {
      value: Preddit.user,
      disabled: false
    });
  this.controller.setupWidget("password",
    this.attributes =
    {
    },
  this.model = {
    value: Preddit.password,
    disabled: false
  });    
  this.controller.setupWidget("save-button",
    this.attributes =
    {
      type: "affirmative"
    })
}

PreferencesAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


PreferencesAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

PreferencesAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

PreferencesAssistant.prototype.handleCommand = function(event)
{
  if(event.type == Mojo.Event.back)
  {
    var user = this.controller.get("user_id").mojo.getValue();
    user = user.replace(/^\s+|\s+$/g,'');
    var password = this.controller.get("password").mojo.getValue();
    password = password.replace(/^\s+|\s+$/g,'');
    if(user.length == 0 || password == 0)
    {
      event.stopPropagation();
      event.preventDefault();
      Mojo.Controller.errorDialog("Enter username and password.");
      return;
    }
    if(user != Preddit.user || password != Preddit.password)
    {
      Preddit.user = user;
      Preddit.password = password;
      Preddit.app_cookie.put({user: Preddit.user, password: Preddit.password});
      Preddit.logged_in = false;      
    }
  }
}