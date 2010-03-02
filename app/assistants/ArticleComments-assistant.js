function ArticleCommentsAssistant(article) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
  this.original_article_data = article;
  this.article_data = article;
  this.comments = new Array();
  this.reply_levels = new Array();
  this.comments_html = "";
  this.url = "http://www.reddit.com/r/" + article.subreddit + "/comments/" + article.id + "/.json";
  //Use below to test edit/delete functions.
  //this.url = "http://www.reddit.com/r/test/comments/ayuty/test_submission_belongs_in_rtest/.json";
}

ArticleCommentsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
  this.controller.setupWidget("comments-list",
  this.list_attributes =
  {
//    renderLimit: 30,
    itemTemplate: "../../templates/comments-list-item"
  },
  this.list_model =
  {
    items: this.comments
  });
  this.controller.setupWidget("wait_spinner",
    this.attributes = 
    {
      spinnerSize: 'large'    
    },
    this.model = 
    {
      spinning: false
    });
    this.article_tap = this.article_tap.bindAsEventListener(this);
    this.comments_tap = this.comments_tap.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get("article_info"), Mojo.Event.tap, this.article_tap);
    Mojo.Event.listen(this.controller.get("comments-list"), Mojo.Event.listTap, this.comments_tap);
    this.url = encodeURI(this.url);
}

ArticleCommentsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
  this.article_voted = false;  
  if(event == undefined)
  {
    if(this.comments.length == 0)
    {
      this.get_comments();
    }
  }
  else if(event.mode != undefined)
  {
    if(event.mode == "reply")
    {
      this.submit_reply(event);
    }
    else if(event.mode == "edit")
    {
      this.edit_reply(event);
    }
    else if(event.mode == "article-reply")
    {
      this.submit_article_reply(event);
    }
    else if(event.mode == "article-edit")
    {
      this.edit_reply(event);
    }
  }  
}


ArticleCommentsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

ArticleCommentsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
  this.comments = new Array();
  Mojo.Event.stopListening(this.controller.get("article_info"), Mojo.Event.tap, this.article_tap);
  Mojo.Event.stopListening(this.controller.get("comments-list"), Mojo.Event.listTap, this.comments_tap);
}

ArticleCommentsAssistant.prototype.handleCommand = function(event) {
  if(event.type == Mojo.Event.back)
  {
    if(this.article_voted)
    {
      event.stopPropagation();
      event.preventDefault();
      this.controller.stageController.popScene("comments_voted");
      return;
    }
  }
  if(event.type == Mojo.Event.command)
  {
    switch(event.command)
    {
      case Mojo.Menu.helpCmd:
        this.controller.stageController.pushAppSupportInfoScene();
        break;
      case Mojo.Menu.prefsCmd:
        this.controller.stageController.pushScene("Preferences");
        break;
    }
  }
  if (event.type === Mojo.Event.commandEnable && (event.command === Mojo.Menu.helpCmd || event.command === Mojo.Menu.prefsCmd ))
  {
    event.stopPropagation();
  }
}
ArticleCommentsAssistant.prototype.get_comments = function() {
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  this.request = new Ajax.Request(this.url,
  {
    method: 'get',
    onSuccess: this.xmlhttp_comments_response.bind(this),
    onFailure: this.xmlhttp_fail_response.bind(this),
    onException: this.xmlhttp_exception.bind(this),
    onInteractive: this.xmlhttp_comments_response.bind(this)
  });
}
ArticleCommentsAssistant.prototype.xmlhttp_comments_response = function(response)
{
  //Mojo.Log.info("response.readyState: ", response.readyState, ", response.status", response.status);
  if(response.readyState != 4)
  {
    return;
  }
  this.controller.get("wait_spinner").mojo.stop();
  this.controller.get("scrim_spinner").style.display = "none";
  if(response.status == 0)
  {
    this.controller.showAlertDialog(
      {
        onChoose: function(value) {if(value == "retry") this.get_comments(); else this.controller.stageController.popScene("timeout")},
        title: $L("Network Timeout"),
        message: $L("Retrieving comments timed out."),
        choices:
        [
          {label:$L('Retry'), value:"retry", type:'affirmative'},  
          {label:$L('Cancel'), value:"cancel", type:'negative'}
        ]
      });
    return; 
  }
  if(response.status == 200)
  {
    // DELETE this new Array() if using prev vs new method.
    this.comments = new Array();
    this.reply_levels = new Array();
    
    var jsontext = eval('(' + response.responseText + ')');
    this.article_data = jsontext[0].data.children[0].data;
    var first_comments = jsontext[1].data.children;
    var current_datetime = new Date();
    var time_elapsed = Preddit.get_time_elapsed(this.article_data.created_utc, current_datetime);
    var vote_classes = Preddit.get_vote_classes(this.article_data.likes, this.article_data.score);
    this.controller.get("article_vote_box").addClassName(vote_classes.score_class);
    switch(vote_classes.score_class)
    {
      case "unvoted":
        this.controller.get("article_vote_box").removeClassName("likes");
        this.controller.get("article_vote_box").removeClassName("dislikes");
        break;
      case "likes":
        this.controller.get("article_vote_box").removeClassName("unvoted");
        this.controller.get("article_vote_box").removeClassName("dislikes");
        break;
      case "dislikes":
        this.controller.get("article_vote_box").removeClassName("unvoted");
        this.controller.get("article_vote_box").removeClassName("likes");
        break;
    }
    this.controller.get("article_vote_up").addClassName(vote_classes.arrow_up_class);
    this.controller.get("article_vote_up").removeClassName(vote_classes.arrow_up_class == "upmod" ? "up" : "upmod");
    this.controller.get("article_vote_down").addClassName(vote_classes.arrow_down_class);
    this.controller.get("article_vote_down").removeClassName(vote_classes.arrow_down_class == "downmod" ? "down" : "downmod");
    this.controller.get("article_score_dislikes").innerHTML = vote_classes.score_dislikes;
    this.controller.get("article_score_unvoted").innerHTML = vote_classes.score_unvoted;
    this.controller.get("article_score_likes").innerHTML = vote_classes.score_likes;
    if(this.article_data.thumbnail == "")
    {
      this.controller.get("article_thumbnail").removeClassName("thumbnail");
      this.controller.get("article_thumbnail").addClassName("no-thumbnail");
    }
    else
    {
      this.controller.get("article_thumbnail").removeClassName("no-thumbnail");
      this.controller.get("article_thumbnail").addClassName("thumbnail");
      this.controller.get("article_thumbnail").src = this.article_data.thumbnail;
    }
    var reply_action_html = "";
    if(this.article_data.author == Preddit.user)
    {
      reply_action_html = reply_action_html + '<span class="reply-action delete-reply';
      reply_action_html = reply_action_html + ' first-reply-action';
      reply_action_html = reply_action_html + '">delete</span>';
    }
    reply_action_html = reply_action_html + '<span class="reply-action comment-reply';
    if(this.article_data.author != Preddit.user)
    {
      reply_action_html = reply_action_html + ' first-reply-action';      
    }
    reply_action_html = reply_action_html + '">reply</span>';
    reply_action_html = reply_action_html + '</div>';        
    this.controller.get("reply_action_area").innerHTML = reply_action_html;
    this.controller.get("detail1").innerHTML = 'Submitted <span id="article_time_elapsed"></span>';
    this.controller.get("save-button").innerHTML = this.article_data.saved ? "unsave" : "save";
    var nsfw = this.article_data.over_18 ? "nsfw" : "sfw";
    this.controller.get("detail2").innerHTML = ('By: <strong id="article_author"></strong> to <strong id="article_subreddit"></strong><strong id="nsfw" class="' + nsfw + '">NSFW</strong>');
    this.controller.get("detail3").innerHTML = '<strong id="comment_count"></strong> comments';
    this.controller.get("article_time_elapsed").innerHTML = (time_elapsed + " ago");
    this.controller.get("article_text").innerHTML = this.article_data.title;
    if(this.article_data.selftext_html != null && this.article_data.selftext_html.length > 0)
    {
      var selfhtml = "";
      {
        var ta = document.createElement("textarea");
        ta.innerHTML = this.article_data.selftext_html;
        selfhtml = ta.value;
      }
      this.controller.get("selftext-html").innerHTML = selfhtml;
    }
    else
    {
      this.controller.get("selftext-html-box").hide();
    }      
    this.controller.get("article_author").innerHTML = this.article_data.author;
    this.controller.get("article_subreddit").innerHTML = this.article_data.subreddit;
    this.controller.get("comment_count").innerHTML = this.article_data.num_comments;
    this.build_comments(first_comments);
    // Dump array for GC
    this.reply_levels = new Array();
    this.list_model.items = this.comments;
    this.controller.modelChanged(this.list_model, this);
  }
}

ArticleCommentsAssistant.prototype.vote = function(thing_id, dir)
{  
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var path = "vote";
  var parameters =
  {
    id: thing_id,
    dir: dir,
    uh: Preddit.modhash,
    r: this.article_data.subreddit
  };
  var op = Preddit.api_loc + path;  
  this.vote_request = new Ajax.Request(op,
                    {
                      method: 'post',
                      parameters: parameters,
                      onSuccess: this.reddit_vote_response.bind(this),
                      onFailure: this.xmlhttp_fail_response.bind(this),
                      onException: this.xmlhttp_exception.bind(this),
                      onInteractive: this.reddit_vote_response.bind(this)
                    });
}

ArticleCommentsAssistant.prototype.reddit_vote_response = function(response)
{
//Mojo.Log.info("response.readyState: ", response.readyState);
//Mojo.Log.info("response.status: ", response.status);
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
//  Mojo.Log.info(Mojo.Log.propertiesAsString(jsontext));
  }
  this.get_comments();
}

ArticleCommentsAssistant.prototype.save_article = function(save_text)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var path = save_text;
  var parameters =
  {
    id: this.article_data.name,
    uh: Preddit.modhash,
  };
  var op = Preddit.api_loc + path;  
  this.save_request = new Ajax.Request(op,
                    {
                      method: 'post',
                      parameters: parameters,
                      onSuccess: this.reddit_save_article_response.bind(this),
                      onFailure: this.xmlhttp_fail_response.bind(this),
                      onException: this.xmlhttp_exception.bind(this),
                      onInteractive: this.reddit_save_article_response.bind(this)
                    });
}

ArticleCommentsAssistant.prototype.reddit_save_article_response = function(response)
{
//  Mojo.Log.info("response.readyState: ", response.readyState);
//  Mojo.Log.info("response.status: ", response.status);
  this.controller.get("wait_spinner").mojo.stop();
  this.controller.get("scrim_spinner").style.display = "none";
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
//    Mojo.Log.info(Mojo.Log.propertiesAsString(jsontext));
  }
  this.get_comments();
}

ArticleCommentsAssistant.prototype.delete_reply = function(id)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var path = "del";
  var parameters =
  {
    id: id,
    executed: 'deleted',
    uh: Preddit.modhash,
    r: this.article_data.subreddit
  };
  var op = Preddit.api_loc + path;
  this.login_request = new Ajax.Request(op,
  {
    method: 'post',
    parameters: parameters,
    onSuccess: this.reddit_vote_response.bind(this),
    onFailure: this.xmlhttp_fail_response.bind(this),
    onException: this.xmlhttp_exception.bind(this),
    onInteractive: this.reddit_vote_response.bind(this)
  });
  if(id == this.article_data.name)
  {
    this.controller.stageController.popScene(this.article_data);
  }
}

ArticleCommentsAssistant.prototype.reddit_delete_reply_response = function(response)
{
//Mojo.Log.info("response.readyState: ", response.readyState);
//Mojo.Log.info("response.status: ", response.status);
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
//  Mojo.Log.info(Mojo.Log.propertiesAsString(jsontext));
  }
  this.get_comments();
}

ArticleCommentsAssistant.prototype.submit_reply = function(data)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var thing_id = "#commentreply_" + data.data.name;
  var path = "comment";
  var parameters =
  {
    thing_id: data.data.name,
    text: data.reply,
    id: thing_id,
    uh: Preddit.modhash,
    r: this.article_data.subreddit
  };
  var op = Preddit.api_loc + path;
//Mojo.Log.info(Mojo.Log.propertiesAsString(parameters));
  this.login_request = new Ajax.Request(op,
  {
    method: 'post',
    parameters: parameters,
    onSuccess: this.reddit_submit_reply_response.bind(this),
    onFailure: this.xmlhttp_fail_response.bind(this),
    onException: this.xmlhttp_exception.bind(this),
    onInteractive: this.reddit_submit_reply_response.bind(this)
  });
}

ArticleCommentsAssistant.prototype.reddit_submit_reply_response = function(response)
{
//Mojo.Log.info("response.readyState: ", response.readyState);
//Mojo.Log.info("response.status: ", response.status);
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
//  Mojo.Log.info(Mojo.Log.propertiesAsString(jsontext));
  }
  this.get_comments();
}

ArticleCommentsAssistant.prototype.edit_reply = function(data)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var path = "editusertext";
  var parameters =
  {
    thing_id: data.data.name,
    text: data.reply,
    uh: Preddit.modhash,
    r: this.article_data.subreddit
  };
  var op = Preddit.api_loc + path;
//Mojo.Log.info(Mojo.Log.propertiesAsString(parameters));
  this.login_request = new Ajax.Request(op,
  {
    method: 'post',
    parameters: parameters,
    onSuccess: this.reddit_edit_reply_response.bind(this),
    onFailure: this.xmlhttp_fail_response.bind(this),
    onException: this.xmlhttp_exception.bind(this),
    onInteractive: this.reddit_edit_reply_response.bind(this)
  });
}

ArticleCommentsAssistant.prototype.reddit_edit_reply_response = function(response)
{
//Mojo.Log.info("response.readyState: ", response.readyState);
//Mojo.Log.info("response.status: ", response.status);
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
//  Mojo.Log.info(Mojo.Log.propertiesAsString(jsontext));
  }
  this.get_comments();
}

ArticleCommentsAssistant.prototype.submit_article_reply = function(data)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var path = "comment";
  var parameters =
  {
    thing_id: data.data.name,
    text: data.reply,
    uh: Preddit.modhash,
    r: this.article_data.subreddit
  };
  var op = Preddit.api_loc + path;
//Mojo.Log.info(Mojo.Log.propertiesAsString(parameters));
  this.login_request = new Ajax.Request(op,
  {
    method: 'post',
    parameters: parameters,
    onSuccess: this.reddit_submit_article_reply_response.bind(this),
    onFailure: this.xmlhttp_fail_response.bind(this),
    onException: this.xmlhttp_exception.bind(this),
    onInteractive: this.reddit_submit_article_reply_response.bind(this)
  });
}

ArticleCommentsAssistant.prototype.reddit_submit_article_reply_response = function(response)
{
//Mojo.Log.info("response.readyState: ", response.readyState);
//Mojo.Log.info("response.status: ", response.status);
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
//  Mojo.Log.info(Mojo.Log.propertiesAsString(jsontext));
  }
  this.get_comments();
}


ArticleCommentsAssistant.prototype.xmlhttp_fail_response = function(response)
{
  Mojo.Log.error("******************** xmlhttp_fail_response ********************");
  for (var i in response)
  {
    Mojo.Log.error("response[",i,"]: ",response[i]);
  }
}
ArticleCommentsAssistant.prototype.xmlhttp_exception = function(requestor, exception)
{
  Mojo.Log.error("******************** xmlhttp_exception ********************");
  Mojo.Log.error("**** requestor dump ****");
  for (var i in requestor)
  {
    Mojo.Log.error("requestor[",i,"]: ",requestor[i]);
  }
  Mojo.Log.error("**** exception dump ****");
  for (var i in exception)
  {
    Mojo.Log.error("exception[",i,"]: ",exception[i]);
  }
}

ArticleCommentsAssistant.prototype.build_comments = function(replies)
{
  var current_datetime = new Date();
  var reply_level = 0;
//  this.comments_html = this.comments_html + "<ul>";
  this.comments_html = "";
  for(var x = 0; x < replies.length; x++)
  {
    if(((typeof replies[x].data.replies) == 'undefined'))
    {
      continue;
    }
//    var kind = (replies[x].kind == "more" ? "t1" : replies[x].kind);
    var bookmark = '<a name="' + replies[x].data.name + '"></a>';
    this.comments_html = this.comments_html + bookmark;
//    var reply_text = replies[x].data.body_html.replace(/&lt;/g,"<").replace(/&gt;/g,">");
    {
      var ta = document.createElement("textarea");
      ta.innerHTML = unescape(replies[x].data.body_html);
      reply_text = ta.value;
    }
    var reply_id = replies[x].data.name;
    var parent_id = replies[x].data.parent_id;
    if(parent_id != reply_id)
    {
      if(this.reply_levels[parent_id] == undefined)
      {
        reply_level = 0;
      }
      else
      {
        reply_level = (this.reply_levels[parent_id] + 1);
      }
    }
    else
    {
      reply_level = 0;
    }
    this.reply_levels[reply_id] = reply_level;
    var ups = (replies[x].data.ups == null ? 0 : replies[x].data.ups);
    var downs = (replies[x].data.downs == null ? 0 : replies[x].data.downs);
    var score = ups - downs;
    var reply_vote_classes = Preddit.get_vote_classes(replies[x].data.likes, score);
    var time_elapsed = Preddit.get_time_elapsed(replies[x].data.created_utc, current_datetime);
    this.comments_html = this.comments_html + '<div id="' + replies[x].data.name + '" style="margin-left: ' + (reply_level * 12) + 'px;">';
    this.comments_html = this.comments_html + '<div class="vote-arrows link midcol "' + reply_vote_classes.score_class + '>';
    this.comments_html = this.comments_html + '  <div id="' + replies[x].data.name + '" class="arrow ' + reply_vote_classes.arrow_up_class + '"></div>';
    this.comments_html = this.comments_html + '  <div style="height: 5px"></div>'
    this.comments_html = this.comments_html + '  <div id="' + replies[x].data.name + '" class="arrow ' + reply_vote_classes.arrow_down_class + '"></div>';
    this.comments_html = this.comments_html + '</div>';
    this.comments_html = this.comments_html + '<div class="reply-metadata">';
    this.comments_html = this.comments_html + '<span class="author">' + replies[x].data.author +
      '</span><span class="score-value">' + score + '</span><span class="score-label"> points ' + time_elapsed + ' ago</span><div class="reply-text">' + reply_text  + '</div>';
    var reply_action_html = '<div style="padding-bottom: 4px;">';
    if(replies[x].data.parent_id != replies[x].data.link_id)
    {
      var bookmark_link = '<a class="parent-link reply-action first-reply-action" href="#' + replies[x].data.parent_id + '">' + 'parent' + '</a>';
      reply_action_html = reply_action_html + bookmark_link;
    }
    if(replies[x].data.author == Preddit.user)
    {
      reply_action_html = reply_action_html + '<span class="reply-action edit-reply';
      if(replies[x].data.parent_id == replies[x].data.link_id)
      {
        reply_action_html = reply_action_html + ' first-reply-action';
      }
      reply_action_html = reply_action_html + '">edit</span><span class="reply-action delete-reply">delete</span>';
    }
    reply_action_html = reply_action_html + '<span class="reply-action comment-reply';
    if(replies[x].data.parent_id == replies[x].data.link_id && replies[x].data.author != Preddit.user)
    {
      reply_action_html = reply_action_html + ' first-reply-action';      
    }
    reply_action_html = reply_action_html + '">reply</span>';
    reply_action_html = reply_action_html + '</div>';
    this.comments_html = this.comments_html + reply_action_html;
    this.comments_html = this.comments_html + '</div>';
    this.comments_html = this.comments_html + '</div>';
    var data = {id: reply_id, data: replies[x].data, reply_level: this.reply_level, html: this.comments_html};
    this.comments.push(data);
    if( (! ((typeof replies[x].data.replies) == 'undefined')) && replies[x].data.replies != "")
    {
      this.build_comments(replies[x].data.replies.data.children);
    }
    this.comments_html = "";
  }
//  this.comments_html = this.comments_html + "</ul>";
}
ArticleCommentsAssistant.prototype.article_tap = function(event)
{
  var tapped_element = this.controller.get(event.target);
  if(tapped_element.hasClassName("arrow"))
  {
    this.article_voted = true;
    if(tapped_element.hasClassName("up"))
    {
      this.vote(this.article_data.name, 1);
    }
    else if(tapped_element.hasClassName("down"))
    {
      this.vote(this.article_data.name, -1);
    }
    else
    {
      this.vote(this.article_data.name, 0);
    }
  }
  else if(tapped_element.hasClassName("save-button"))
  {
    this.save_article(tapped_element.innerHTML);
  }
  else if(tapped_element.hasClassName("comment-reply"))
  {
    this.controller.stageController.pushScene("ReplyComment", {mode: "article-reply", data: this.article_data});
    return;
  }
  else if(tapped_element.hasClassName("edit-reply"))
  {
    this.controller.stageController.pushScene("ReplyComment", {mode: "article-edit", data: this.article_data});
    return;
  }
  else if(tapped_element.hasClassName("delete-reply"))
  {
    this.controller.showAlertDialog({
      onChoose: function(value) {if(value == "delete") this.delete_reply(this.article_data.name)},
      title: $L("Delete Reply"),
      message: $L("Are you sure you want to delete this submission?"),
      choices:[
      {label:$L('Delete'), value:"delete", type:'affirmative'},
      {label:$L('Cancel'), value:"cancel", type:'negative'}
      ]
    }); 
    return;
  }
  else
  {
    this.controller.stageController.pushScene("WebView", this.article_data.url);
  }
}

ArticleCommentsAssistant.prototype.comments_tap = function(event)
{
  var tapped_element = this.controller.get(event.originalEvent.target);
  if(tapped_element.hasClassName("arrow"))
  {
    if(tapped_element.hasClassName("up"))
    {
      this.vote(tapped_element.id, 1);
    }
    else if(tapped_element.hasClassName("down"))
    {
      this.vote(tapped_element.id, -1);
    }
    else
    {
      this.vote(tapped_element.id, 0);
    }
    return;
  }
  if(tapped_element.hasClassName("comment-reply"))
  {
    this.controller.stageController.pushScene("ReplyComment", {mode: "reply", data: event.item.data});
    return;
  }
  if(tapped_element.hasClassName("edit-reply"))
  {
    this.controller.stageController.pushScene("ReplyComment", {mode: "edit", data: event.item.data});
    return;
  }
  if(tapped_element.hasClassName("delete-reply"))
  {
    this.controller.showAlertDialog({
      onChoose: function(value) {if(value == "delete") this.delete_reply(event.item.id)},
      title: $L("Delete Reply"),
      message: $L("Are you sure you want to delete this reply?"),
      choices:[
      {label:$L('Delete'), value:"delete", type:'affirmative'},
      {label:$L('Cancel'), value:"cancel", type:'negative'}
      ]
    }); 
    return;
  }
  
}