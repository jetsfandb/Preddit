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
/*  
  this.controller.setupWidget("save-button",
    this.attribute =
    {
    },
    this.model =
    {
      buttonClass: "affirmative",
      label: "Save and Login"
    });

    this.save_tap = this.save_tap.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get("save-button"), Mojo.Event.tap, this.save_tap);
*/  
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
  //Mojo.Event.stopListening(this.controller.get("save-button"), Mojo.Event.tap, this.save_tap);
}

PreferencesAssistant.prototype.handleCommand = function(event)
{
  if(event.type == Mojo.Event.back)
  {
    if(! this.user_password_valid())
    {
      event.stopPropagation();
      event.preventDefault();
      Mojo.Controller.errorDialog("Enter username and password.");
      return;
    }
    this.save_user_password();
  }
  else if (event.type === Mojo.Event.commandEnable && (event.command === Mojo.Menu.helpCmd || event.command === Mojo.Menu.prefsCmd ))
  {
    event.stopPropagation();
  }
}
/*
PreferencesAssistant.prototype.save_tap = function(event) {
  if(! this.user_password_valid())
  {
    Mojo.Controller.errorDialog("Enter username and password.");
    return;
  }
  this.save_user_password();
  this.controller.stageController.popScene();
}
*/
PreferencesAssistant.prototype.user_password_valid = function() {
  this.user = this.controller.get("user_id").mojo.getValue();
  this.user = this.user.replace(/^\s+|\s+$/g,'');
  this.password = this.controller.get("password").mojo.getValue();
  this.password = this.password.replace(/^\s+|\s+$/g,'');
  return (this.user.length > 0 && this.password.length > 0);
}

PreferencesAssistant.prototype.save_user_password = function() {
  if(this.user != Preddit.user || this.password != Preddit.password)
  {
    Preddit.user = this.user;
    Preddit.password = this.password;
    Preddit.save_cookie();
//    Preddit.store_user(this.user, this.password);
    Preddit.logged_in = false;
  }
}