function ReplyCommentAssistant(comment_data) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
  this.comment_data = comment_data;
}

ReplyCommentAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */ 
  var reply_text = "";
  if(this.comment_data.mode == "reply" ||
     this.comment_data.mode == "article-reply")
  {
    var comment = (this.comment_data.mode == "reply" ? this.comment_data.data.body : this.comment_data.data.title);
    this.controller.setupWidget("comment_text",
      this.attributes =
      {
        textCase: Mojo.Widget.steModeLowerCase,
        multiline: true,
        charsAllow: function(event) {return false;},
        focus: false,
      },
      this.model =
      {
        value: comment,
        disabled: false
      });
  }
  else
  {
    this.controller.get("comment_group").hide();
    reply_text = (this.comment_data.mode == "edit" ? this.comment_data.data.body : this.comment_data.data.title);
  }
  this.controller.setupWidget("reply_text",
    this.attributes =
    {
      textCase: Mojo.Widget.steModeLowerCase,
      multiline: true,
      focus: true,
    },
    this.model =
    {
      value: reply_text,
      disabled: false
    });
  this.controller.setupWidget("submit_button",
    this.attributes = 
    {
    },
    this.model = 
    {
      label : "Save",
      buttonClass: "affirmative",
      disabled: false
    });    
  this.controller.setupWidget("format_button",
    this.attributes = 
    {
    },
    this.format_button_model = 
    {
      label : "Format help",
      disabled: false
    });    
  this.save_tap = this.save_tap.bindAsEventListener(this);
  this.format_tap = this.format_tap.bindAsEventListener(this);
  Mojo.Event.listen(this.controller.get("submit_button"), Mojo.Event.tap, this.save_tap);
  Mojo.Event.listen(this.controller.get("format_button"), Mojo.Event.tap, this.format_tap);
}

ReplyCommentAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


ReplyCommentAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

ReplyCommentAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}
ReplyCommentAssistant.prototype.save_tap = function(event) {
  var reply_text = this.controller.get("reply_text").mojo.getValue();
  reply_text = reply_text.replace(/^\s+|\s+$/g,'');

  if(reply_text.length == 0)
  {
    Mojo.Controller.errorDialog("Reply is empty.");
    return;
  }
  this.comment_data.reply = this.controller.get("reply_text").mojo.getValue();
  this.controller.stageController.popScene(this.comment_data);
}
ReplyCommentAssistant.prototype.format_tap = function(event) {
  if(this.format_button_model.label == "Format help")
  {
    $("format_help").removeClassName("hidden");
    this.format_button_model.label = "Hide help";
  }
  else
  {
    $("format_help").addClassName("hidden");
    this.format_button_model.label = "Format help";    
  }
  this.controller.modelChanged(this.format_button_model, this);
}