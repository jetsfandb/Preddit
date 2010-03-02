function MainAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

MainAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
  this.firstTime = true;
  this.articles = new Array();
  this.before_id = "";
  this.after_id = "";
  this.count = 0;
  this.url = "http://www.reddit.com/";
  this.operation = "";
  this.controller.setupWidget("wait_spinner",
    this.attributes = 
    {
      spinnerSize: 'large'    
    },
    this.model = 
    {
      spinning: false
    });
  this.controller.setupWidget("article_list",
    this.list_attributes = 
    {
//      renderLimit: 30,
      itemTemplate: "../../templates/article-list-item"
    },
    this.list_model = 
    {
      items: this.articles
    });
    this.refresh_model =
    {
      visible: true,
      label: $L('refresh'),
      id: "refresh_button",
    // if before == id of 1st then no prev     
      items: 
      [
        {},
        {},
        {icon: "home", command: 'frontpage'},
        {icon: "refresh", command: 'refresh'},
        {},
        {},
//        {label: "/r", command: 'subreddits'},
        {icon: "forward", command: 'next'}
      ]
    };
    this.article_tap = this.article_tap.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get("article_list"), Mojo.Event.listTap, this.article_tap);
    this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.refresh_model);
}

MainAssistant.prototype.activate = function(event) {
  if(this.firstTime)
  {
    this.firstTime = false;
    if(Preddit.app_cookie)
    {
      var cookie_data = Preddit.app_cookie.get();
      if( (! cookie_data) || (! cookie_data.user) )
      {
        // Get User and password
        this.controller.stageController.pushScene("Preferences");
        return;
      }
      else
      {
        Preddit.user = cookie_data.user;
        Preddit.password = cookie_data.password;
      }
    }
    else
    {
      this.controller.stageController.pushScene("Preferences");
      return;
    }
  }
  if(! Preddit.logged_in)
  {
    this.login();
  }
  else
  {
    if(event != undefined && event == "subreddit")
    {
      this.controller.get("header-title").innerHTML = ("Preddit - " + Preddit.subreddit);
    }
    this.get_articles(Preddit.subreddit);
  }
}

MainAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

MainAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

MainAssistant.prototype.handleCommand = function(event) {
  
  if(event.type == Mojo.Event.command)
  {
    switch(event.command)
    {
      case "refresh":
        this.get_articles("refresh");
        break;
      case "next":
        this.get_articles("next");
        break;
      case "previous":
        this.get_articles("previous");
        break;
      case "frontpage":
        if(Preddit.subreddit != "frontpage")
        {
          this.count = 0;
        }
        this.controller.get("header-title").innerHTML = "Preddit";
        Preddit.subreddit = "frontpage";
        this.get_articles(Preddit.subreddit);
        break;
      case "subreddits":
        this.controller.stageController.pushScene("Subreddits");
        break;
      case Mojo.Menu.helpCmd:
        this.controller.stageController.pushAppSupportInfoScene();
        break;
      case Mojo.Menu.prefsCmd:
        this.controller.stageController.pushScene("Preferences");
        break;
    }
  } 
  else if (event.type === Mojo.Event.commandEnable && (event.command === Mojo.Menu.helpCmd || event.command === Mojo.Menu.prefsCmd ))
  {
    event.stopPropagation();
  }
}

MainAssistant.prototype.login = function()
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var path = "login" + "/" + Preddit.user;
  var parameters =
  {    
   user: Preddit.user,
   passwd: Preddit.password,
   api_type: 'json'
  };
  var op = Preddit.api_loc + path;
  this.login_request = new Ajax.Request(op,
                    {
                      method: 'post',
                      parameters: parameters,
                      onSuccess: this.reddit_login_response.bind(this),
                      onFailure: this.xmlhttp_fail_response.bind(this),
                      onException: this.xmlhttp_exception.bind(this),
                      onInteractive: this.reddit_login_response.bind(this)
                    });  

}

MainAssistant.prototype.reddit_login_response = function(response)
{
//Mojo.Log.error("response.readyState: ", response.readyState);
//Mojo.Log.error("response.status: ", response.status);
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
    var json = jsontext.json;
    if(typeof(json.data) == 'undefined')
    {
      this.controller.get("wait_spinner").mojo.stop();
      this.controller.get("scrim_spinner").style.display = "none";
      this.controller.showAlertDialog({
        onChoose: function(value) {this.controller.stageController.pushScene("Preferences");},
        preventCancel: true,
        title: $L("Error"),
        message: $L("Invalid user id/password"),
        choices:[
        {label:$L("Close"), value:"close"}
        ]
      });       
      return;
    }
    Preddit.logged_in = true;
    Preddit.modhash = json.data.modhash;
    Preddit.cookie = new Mojo.Model.Cookie("www.reddit.com");
    Preddit.cookie.put(json.data.cookie);
    if(Preddit.subreddits.length == 0)
    {
      this.get_subreddits();
    }    
    this.get_articles(Preddit.subreddit);
  }
}

MainAssistant.prototype.vote = function(item, dir)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var path = "vote";
  var parameters =
  {
    id: item.thing_id,
    dir: dir,
    uh: Preddit.modhash,
    r: item.subreddit
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

MainAssistant.prototype.reddit_vote_response = function(response)
{
//Mojo.Log.error("response.readyState: ", response.readyState);
//Mojo.Log.error("response.status: ", response.status);
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
//  Mojo.Log.error(Mojo.Log.propertiesAsString(jsontext));
  }
  this.get_articles("update");
}

MainAssistant.prototype.get_subreddits = function()
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var op = "http://www.reddit.com/reddits/.json";
  this.get_subreddits_request = new Ajax.Request(op,
  {
    method: 'post',
    onSuccess: this.reddit_subreddits_response.bind(this),
    onFailure: this.xmlhttp_fail_response.bind(this),
    onException: this.xmlhttp_exception.bind(this),
    onInteractive: this.reddit_subreddits_response.bind(this)
  });
}

MainAssistant.prototype.reddit_subreddits_response = function(response)
{
//Mojo.Log.error("response.readyState: ", response.readyState);
//Mojo.Log.error("response.status: ", response.status);
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
    var subreddit_list = jsontext["data"]["children"];
    for(var x = 0; x < subreddit_list.length; x++)
    {
      var short_desc = "";
      if(subreddit_list[x].data.description != null)
      {
        if (subreddit_list[x].data.description.length > 80)
        {
          short_desc = (subreddit_list[x].data.description.substr(0, 80) + "...");
        }
        else
        {
          short_desc = subreddit_list[x].data.description;
        }
      }
      subreddit_list[x].data.short_desc = short_desc;
      Preddit.subreddits.push(subreddit_list[x].data);
    }
//  Mojo.Log.error(Mojo.Log.propertiesAsString(jsontext));
  }
}

MainAssistant.prototype.get_articles = function(operation)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  this.operation = operation;
  var base_url = "http://www.reddit.com/";
  if(Preddit.subreddit != "frontpage")
  {
    base_url = base_url + Preddit.subreddit;
  }
  base_url = base_url + ".json";
  switch(operation)
  {
    case "refresh":
      break;
    case "previous":
      this.url = base_url + "?count=" + ((this.count - this.articles.length) + 1) + "&before=" + this.before_id;
      break;
    case "next":
      this.url = base_url + "?count=" + this.count + "&after=" + this.after_id;
      break;
    case "subreddit":
      this.count = 0;
      this.url = base_url;
      break;
    case "frontpage":
      this.url = base_url;
      break;
    default:
      this.url = base_url;
      break;
  }
  this.url = encodeURI(this.url);
  this.request = 
    new Ajax.Request(this.url,
    {
      method: 'get',
      onSuccess: this.xmlhttp_articles_response.bind(this),
      onFailure: this.xmlhttp_fail_response.bind(this),
      onException: this.xmlhttp_exception.bind(this),
      onInteractive: this.xmlhttp_articles_response.bind(this)
    });
}

MainAssistant.prototype.xmlhttp_articles_response = function(response)
{
  //Mojo.Log.error("response.readyState: ", response.readyState, ", response.status", response.status);
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
      onChoose: function(value) {if(value == "retry") this.get_articles(this.operation);},
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
  else if(response.status != 200)
  {
    return;
  }
  this.list_model.items = new Array();

  var jsontext = eval('(' + response.responseText + ')');
  Mojo.Log.error("Before: ", jsontext["data"]["before"]);
  Mojo.Log.error("After", jsontext["data"]["after"]);
  Mojo.Log.error("First", jsontext["data"]["children"][0]["data"]["name"]);
  Mojo.Log.error("Lastst", jsontext["data"]["children"][(jsontext["data"]["children"].length - 1)]["data"]["name"]);
  this.before_id = jsontext["data"]["before"];
  this.after_id = jsontext["data"]["after"];
  var article_list = jsontext["data"]["children"];
  this.articles = new Array();
  var current_datetime = new Date();
  for(var x = 0; x < article_list.length; x++)
  {
    var article = article_list[x].data;
    if(article.thumbnail.substr(0,7) == "/static")
    {
      article.thumbnail = "../images" + article.thumbnail.substr(7);
    }
    var thumbnail_class = "thumbnail";
    if(article.thumbnail == "")
    {
      thumbnail_class = (thumbnail_class + " no-thumbnail");
    }
    var nsfw = article.over_18 ? "nsfw" : "sfw";
    {
      var ta = document.createElement("textarea");
      ta.innerHTML = article.title;    
      article.title = ta.value;
    }
    var vote_classes = Preddit.get_vote_classes(article.likes, article.score);
    var time_elapsed = Preddit.get_time_elapsed(article.created_utc, current_datetime);
    var data =
    {
      id: article.id,
      thing_id: article.name,
      title: article.title,
      thumbnail: article.thumbnail, 
      thumbnail_class: thumbnail_class, 
      url: article.url, 
      author: article.author, 
      subreddit: article.subreddit,
      nsfw: nsfw,
      num_comments: article.num_comments,
      time_elapsed: time_elapsed,
      arrow_up_class: vote_classes.arrow_up_class,
      arrow_down_class: vote_classes.arrow_down_class,
      score_class: vote_classes.score_class,
      score_unvoted: vote_classes.score_unvoted,
      score_likes: vote_classes.score_likes,
      score_dislikes: vote_classes.score_dislikes
    };
    this.articles.push(data);
  }
  switch(this.operation)
  {
    case "next":
      this.count += this.articles.length;
      break;
    case "previous":
      this.count -= this.articles.length;
      break;
    case "all":
      this.count = this.articles.length;
      break;
  }
  this.list_model.items = this.articles;
  this.controller.modelChanged(this.list_model, this);
  var item_index = 0;
  if(this.operation == "update")
  {
    item_index = this.tapped_index;
  }
  this.controller.get("article_list").mojo.revealItem(item_index, false);
  var buttons = new Array();
  Mojo.Log.error("WTF???: ", this.before_id);
  if(this.before_id != null && this.before_id.length > 0)
  {
    buttons.push({icon: "back", command: 'previous'});
  }
  else
  {
    buttons.push({});
  }
  buttons.push({});
  buttons.push({});
  buttons.push({icon: "refresh", command: 'refresh'});
  buttons.push({});
  buttons.push({});
//  buttons.push({label: "/r", command: 'subreddits'});
  buttons.push({icon: "forward", command: 'next'});
  
  this.refresh_model.items = buttons;
  this.controller.modelChanged(this.refresh_model, this);
}

MainAssistant.prototype.xmlhttp_fail_response = function(response)
{
  Mojo.Log.error("******************** xmlhttp_fail_response ********************");
  for (var i in response)
  {
    Mojo.Log.error("response[",i,"]: ",response[i]);
  }
}
MainAssistant.prototype.xmlhttp_exception = function(requestor, exception)
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

MainAssistant.prototype.article_tap = function(event)
{
  this.tapped_index = event.index;
  var tapped_element = $(event.originalEvent.target);
  if(tapped_element.hasClassName("detail-line"))
  {
    this.controller.stageController.pushScene("ArticleComments", event.item);
  }
  else if(tapped_element.hasClassName("arrow"))
  {
    if(tapped_element.hasClassName("up"))
    {
      this.vote(event.item, 1);
    }
    else if(tapped_element.hasClassName("down"))
    {
      this.vote(event.item, -1);
    }
    else
    {
      this.vote(event.item, 0);
    }
  }
  else
  {
    this.controller.serviceRequest("palm://com.palm.applicationManager",
    {
      method: "open",
      parameters:
      {
        id: 'com.palm.app.browser',
        params:
        {
          target: event.item.url
        }
      }
    });
  }
}
