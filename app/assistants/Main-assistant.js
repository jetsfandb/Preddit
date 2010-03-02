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
  this.keepalive_timer = null;
  this.keepalive_login = false;
  this.url = "http://www.reddit.com/";
  this.operation = "";
  this.reddits_menu = new Array();

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
      itemTemplate: "../../templates/article-list-item",
      emptyTemplate: "../../templates/article-list-empty",
      swipeToDelete: true,
      autoconfirmDelete: true
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
        {icon: "reddit-no-mail", command: 'messages'},
        {label: "fp", command: 'frontpage'},
        {icon: "refresh", command: 'refresh'},
        {label: "/r", command: 'subreddits'},
        {},
        {icon: "forward", command: 'next'}
      ]
    };
    this.article_tap = this.article_tap.bindAsEventListener(this);
    this.article_delete = this.article_delete.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get("article_list"), Mojo.Event.listTap, this.article_tap);
    Mojo.Event.listen(this.controller.get("article_list"), Mojo.Event.listDelete, this.article_delete);
    this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.refresh_model);
    this.controller.setupWidget(Mojo.Menu.appMenu, {}, this.menu_model = 
      {
        visible: true, 
        items:
        [
          {label: "Reddits", items: this.reddits_menu},
          {label: "Categories", items:
                                [
                                  {label: "Hot", command: "hot"},
                                  {label: "New", items:
                                                 [
                                                   {label: "What's new", command: "new"},
                                                   {label: "Sorted by new", command: "new_sort_new"},
                                                   {label: "Sorted by rising", command: "new_sort_rising"}
                                                 ]
                                  },
                                  {label: "Controversial", items:
                                                           [
                                                             {label: "What's controversial", command: "controversial"},
                                                             {label: "This hour", command: "controversial_hour"},
                                                             {label: "This week", command: "controversial_week"},
                                                             {label: "This month", command: "controversial_month"},
                                                             {label: "This year", command: "controversial_year"},
                                                             {label: "All time", command: "controversial_alltime"}
                                                           ]
                                  },
                                  {label: "Top", items:
                                                 [
                                                   {label: "Top scoring", command: "top"},
                                                   {label: "This hour", command: "top_hour"},
                                                   {label: "This week", command: "top_week"},
                                                   {label: "This month", command: "top_month"},
                                                   {label: "This year", command: "top_year"},
                                                   {label: "All time", command: "top_alltime"}
                                                 ]
                                  },
                                  {label: "Saved", command: "saved"}
                                ]
          }
        ]
      });
    
}

MainAssistant.prototype.activate = function(event) {
  this.controller.stageController.setWindowOrientation("free");
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
        if(cookie_data && cookie_data.subscriptions)
        {
          Preddit.save_cookie(); // Remove subscriptions from cookie
        }
      }
    }
    else
    {
      this.controller.stageController.pushScene("Preferences");
      return;
    }
    if(Preddit.user == "")
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
    if(event != undefined)
    {
      this.get_subscriptions(0, null);
      switch(event)
      {
        case "subreddit":
          this.get_articles("subreddit");
          break;
        default:
          this.get_articles("update");
          break;
      }
    }
  }
}

MainAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
  clearTimeout(this.keepalive_timer);
}

MainAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
  Mojo.Event.stopListening(this.controller.get("article_list"), Mojo.Event.listTap, this.article_tap);
  Mojo.Event.stopListening(this.controller.get("article_list"), Mojo.Event.listDelete, this.article_delete);
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
        this.count = 0;
        this.controller.get("header-title").innerHTML = "Preddit";
        Preddit.subreddit = "frontpage";
        Preddit.category = "hot";
        Preddit.subcategory = "";
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
      case "hot":
      case "new":
      case "controversial":
      case "top":
      case "saved":
        Preddit.category = event.command;
        Preddit.subcategory = "";
        this.controller.get("header-title").innerHTML = ("Preddit - " + event.command);
        this.get_articles("frontpage");
        break;
      
      case "new_sort_rising":
      case "new_sort_new":
      case "controversial_hour":
      case "controversial_today":
      case "controversial_week":
      case "controversial_month":
      case "controversial_year":
      case "controversial_alltime":
      case "top_hour":
      case "top_today":
      case "top_week":
      case "top_month":
      case "top_year":
      case "top_alltime":
        var splitter = event.command.indexOf("_");
        var cat = event.command.substr(0, splitter);
        var subcat = event.command.substr(splitter + 1);
        Preddit.category = cat;
        Preddit.subcategory = subcat;
        this.controller.get("header-title").innerHTML = ("Preddit - " + cat + " - " + subcat);
        this.get_articles("frontpage");
        break;
      case messages:
        this.controller.stageController.pushScene("Messages");
        break;       
      default:
        if(event.command.substr(0, 10) == "subreddit_")
        {
          Preddit.subreddit = ("/r/" + event.command.substr(10));
          this.get_articles("subreddit");
        }
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
//Mojo.Log.info("response.readyState: ", response.readyState);
//Mojo.Log.info("response.status: ", response.status);
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
    this.keepalive_timer = setTimeout(this.keep_alive, (600000));
    if(! this.keepalive_login)
    {
      this.get_articles(Preddit.subreddit);
      this.check_mail();
      this.get_subscriptions(0, null);
    }
    this.keepalive_login = false;
  }
}

MainAssistant.prototype.check_mail = function()
{
  var op = "http://www.reddit.com/user/" + Preddit.user + "/about.json";
  this.mail_request = new Ajax.Request(op,
  {
    method: 'post',
    onSuccess: this.reddit_mail_check_response.bind(this),
    onFailure: this.xmlhttp_fail_response.bind(this),
    onException: this.xmlhttp_exception.bind(this),
    onInteractive: this.reddit_mail_check_response.bind(this)
  });
}

MainAssistant.prototype.reddit_mail_check_response = function(response)
{
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
    Preddit.has_mail = jsontext.data.has_mail;
    if(Preddit.has_mail)
    {
      this.refresh_model.items[1] = {icon: "reddit-mail", command: 'messages'};
      this.controller.modelChanged(this.refresh_model, this);
    }
  }
}

MainAssistant.prototype.vote = function(item, dir)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  this.vote_id = item.thing_id;
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
//Mojo.Log.info("response.readyState: ", response.readyState);
//Mojo.Log.info("response.status: ", response.status);
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
//  Mojo.Log.info(Mojo.Log.propertiesAsString(jsontext));
  }
  this.get_articles("refresh");
//  this.update_article(this.vote_id);
}
MainAssistant.prototype.get_subscriptions = function(count, after_id)
{
  var path ="http://www.reddit.com/reddits/mine.json";
  if(count > 0)
  {
    path = path + "?count=" + count + "&after=" + after_id;
  }
  else
  {
     Preddit.subscriptions = new Array();
     this.reddits_menu = new Array();
  }
  this.subscription_request = new Ajax.Request(path,
  {
    method: 'post',
    onSuccess: this.subscription_response.bind(this),
    onFailure: this.xmlhttp_fail_response.bind(this),
    onException: this.xmlhttp_exception.bind(this),
    onInteractive: this.subscription_response.bind(this)
  });
}


MainAssistant.prototype.subscription_response = function(response)
{
//  Mojo.Log.info("response.readyState: ", response.readyState);
//  Mojo.Log.info("response.status: ", response.status);
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
//  Mojo.Log.info(Mojo.Log.propertiesAsString(jsontext));
    var subscriptions = jsontext.data.children;
    for(var x = 0; x < subscriptions.length; x++)
    {
      var subreddit = Preddit.reddit_from_url(subscriptions[x].data.url);
      Preddit.subscriptions.push({id: subscriptions[x].data.name, name: subreddit});
      var menu_cmd = "subreddit_" + subreddit;
      this.reddits_menu.push({label: subreddit, command: menu_cmd});
    }
    if(jsontext.data.after == null)
    {
      this.menu_model.items[0].items = this.reddits_menu;
      this.controller.modelChanged(this.menu_model, this);
    }
    else
    {
      this.get_subscriptions(Preddit.subscriptions.length, jsontext.data.after);
    }
  }
}

MainAssistant.prototype.hide_article = function(article)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var path = "hide";
  var parameters =
  {
    id: article.thing_id,
    uh: Preddit.modhash,
  };
  var op = Preddit.api_loc + path;  
  this.vote_request = new Ajax.Request(op,
                    {
                      method: 'post',
                      parameters: parameters,
                      onSuccess: this.reddit_hide_article_response.bind(this),
                      onFailure: this.xmlhttp_fail_response.bind(this),
                      onException: this.xmlhttp_exception.bind(this),
                      onInteractive: this.reddit_hide_article_response.bind(this)
                    });
}

MainAssistant.prototype.reddit_hide_article_response = function(response)
{
//  Mojo.Log.info("response.readyState: ", response.readyState);
//  Mojo.Log.info("response.status: ", response.status);
  this.controller.get("wait_spinner").mojo.stop();
  this.controller.get("scrim_spinner").style.display = "none";
  if(response.readyState == 4 && response.status == 200)
  {
    var jsontext = eval('(' + response.responseText + ')');
//  Mojo.Log.info(Mojo.Log.propertiesAsString(jsontext));
  }
}

MainAssistant.prototype.save_article = function(article)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var path = article.save_text;
  var parameters =
  {
    id: article.thing_id,
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

MainAssistant.prototype.reddit_save_article_response = function(response)
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
  this.get_articles("refresh");
}

MainAssistant.prototype.get_articles = function(operation)
{
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  this.check_mail();
  this.operation = operation;
  var url = this.url;
  var base_url = "http://www.reddit.com/";
  var parameters = new Array();
  if(Preddit.subreddit != "frontpage")
  {
    base_url = base_url + Preddit.subreddit;
  }
  if(Preddit.category != "hot")
  {
    base_url = base_url  + Preddit.category + "/";
  }
  base_url = base_url + ".json";
  switch(Preddit.subcategory)
  {
    case "rising":
      parameters.push("sort=rising");
      break;
    case "new":
      parameters.push("sort=new");
      break;      
    case "hour":
      parameters.push("t=hour");
      break;
    case "today":
      parameters.push("t=day");
      break;
    case "week":
      parameters.push("t=week");
      break;
    case "month":
      parameters.push("t=month");
      break;
    case "year":
      parameters.push("t=year");
      break;
    case "alltime":
      parameters.push("t=all");
      break;
  }
  
  switch(this.operation)
  {
    case "refresh":
      url = this.url;
      break;
    case "previous":
      parameters.push("count=" + ((this.count - this.articles.length) + 1) + "&before=" + this.before_id);
      url = base_url;
      break;
    case "next":
      parameters.push("count=" + this.count + "&after=" + this.after_id);
      url = base_url;
      break;
    case "subreddit":
      this.controller.get("header-title").innerHTML = ("Preddit - " + Preddit.reddit_from_url(Preddit.subreddit));
      this.count = 0;
      url = base_url;
      break;
    case "frontpage":
      url = base_url;
      break;
    default:      
      break;
  }
  if(this.operation != "refresh" && parameters.length > 0)
  {
    var parameter_text = "";
    for(var p = 0; p < parameters.length; p++)
    {
      if(p > 0)
      {
        parameter_text = parameter_text + ("&" + parameters[p]);
      }
      else
      {
        parameter_text = parameter_text + ("?" + parameters[p]);
      }
    }
    url = url + parameter_text;
  }
  this.url = encodeURI(url);
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
  this.before_id = jsontext["data"]["before"];
  this.after_id = jsontext["data"]["after"];
  var article_list = jsontext["data"]["children"];
  this.articles = new Array();
  var current_datetime = new Date();
  for(var x = 0; x < article_list.length; x++)
  {
    var article = article_list[x].data;
    if(Preddit.subreddit == "frontpage")
    {
      var subscribed = false;    
      for(var s = 0; s < Preddit.subscriptions.length; s++)
      {
        if(Preddit.subscriptions[s].name == article.subreddit)
        {
          subscribed = true;
          break;
        }
      }
      if(! subscribed)
      {
        Mojo.Log.info("Adding new subscription", article.subreddit);
        Preddit.subscriptions.push({id: article.subreddit_id, name: article.subreddit});
//      Preddit.save_cookie();
        var menu_cmd = "subreddit_" + article.subreddit;
        this.reddits_menu.push({label: article.subreddit, command: menu_cmd});
        this.menu_model.items[0].items = this.reddits_menu;
        this.controller.modelChanged(this.menu_model, this);
      }
    }
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
    var save_text = article.saved ? "unsave" : "save";
    var data =
    {
      id: article.id,
      thing_id: article.name,
      title: article.title,
      thumbnail: article.thumbnail, 
      thumbnail_class: thumbnail_class, 
      url: article.url,
      domain: article.domain,
      selftext_html: article.selftext_html,
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
      score_dislikes: vote_classes.score_dislikes,
      save_text: save_text
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
    case "frontpage":
      this.count = this.articles.length;
      break;
    case "subreddit":
      this.count = this.articles.length;
      break;
  }
  this.list_model.items = this.articles;
  this.controller.modelChanged(this.list_model, this);
//if(this.operation == "update")
//{
//  item_index = this.tapped_index;
//  this.controller.get("article_list").mojo.revealItem(item_index, false);
//}
//else if(this.operation == "next" || this.operation == "previous" || this.operation == "frontpage" || this.operation == "subreddit")
  if(this.operation == "next" || this.operation == "previous" || this.operation == "frontpage" || this.operation == "subreddit")
  {
    this.controller.get("article_list").mojo.revealItem(0, false);
  }
  if(this.operation != "refresh")
  {
    var buttons = new Array();
  //if(this.before_id != null && this.before_id.length > 0)
    var mail_icon = (Preddit.has_mail ? "reddit-mail" : "reddit-no-mail");
    if((this.operation != "frontpage") && (this.operation != "subreddit") &&  (this.count - this.articles.length) > 0)
    {
      buttons.push({icon: "back", command: 'previous'});
    }
    else
    {
      buttons.push({});
    }
    buttons.push({icon: mail_icon, command: 'messages'});
    buttons.push({label: "fp", command: 'frontpage'});
    buttons.push({icon: "refresh", command: 'refresh'});
    buttons.push({label: "/r", command: 'subreddits'});
    buttons.push({});
    buttons.push({icon: "forward", command: 'next'});
  
    this.refresh_model.items = buttons;
    this.controller.modelChanged(this.refresh_model, this);
  }
}

MainAssistant.prototype.update_article = function(article_id)
{
  var url = "http://www.reddit.com/by_id/" + article_id + "/.json";
  this.request = 
    new Ajax.Request(url,
    {
      method: 'get',
      onSuccess: this.xmlhttp_update_article_response.bind(this),
      onFailure: this.xmlhttp_fail_response.bind(this),
      onException: this.xmlhttp_exception.bind(this),
      onInteractive: this.xmlhttp_update_article_response.bind(this)
    });
}
MainAssistant.prototype.xmlhttp_update_article_response = function(response)
{
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
      onChoose: function(value) {if(value == "retry") this.update_article(article_id);},
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
  var jsontext = eval('(' + response.responseText + ')');
  var subreddit_list = jsontext["data"]["children"];  
  var article = subreddit_list[0].data;
  if(Preddit.subreddit == "frontpage")
  {
    var subscribed = false;    
    for(var s = 0; s < Preddit.subscriptions.length; s++)
    {
      if(Preddit.subscriptions[s] == article.subreddit)
      {
        subscribed = true;
        break;
      }
    }
    if(! subscribed)
    {
      Mojo.Log.info("Adding new subscription", article.subreddit);
      Preddit.subscriptions.push(article.subreddit);
      Preddit.save_cookie();
      var menu_cmd = "subreddit_" + article.subreddit;
      this.reddits_menu.push({label: article.subreddit, command: menu_cmd});
      this.menu_model.items[0].items = this.reddits_menu;
      this.controller.modelChanged(this.menu_model, this);
    }
  }
  for(var x = 0; x < this.list_model.items.length; x++)
  {
    if(this.list_model.items[x].name == article.name)
    {
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
      var save_text = article.saved ? "unsave" : "save";
      var data =
      {
        id: article.id,
        thing_id: article.name,
        title: article.title,
        thumbnail: article.thumbnail, 
        thumbnail_class: thumbnail_class, 
        url: article.url,
        domain: article.domain,
        selftext_html: article.selftext_html,
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
        score_dislikes: vote_classes.score_dislikes,
        save_text: save_text
      };
//      this.articles.splice(x, 1);
//      this.articles.splice(x, 1, data);
//      this.list_model.items = this.articles;
      //this.list_model.items[x] = data;
      var t = new Array();
      t.push(data);
      this.controller.get("article_list").mojo.invalidateItems(x, 1);
      this.controller.get("article_list").mojo.noticeUpdatedItems(x, t);
      break;
    }
  }
  this.controller.modelChanged(this.list_model, this);  
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
  if(tapped_element.hasClassName("arrow"))
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
  else if(tapped_element.hasClassName("save-button"))  
  {
    this.save_article(event.item);
    
  }
  else if(tapped_element.hasClassName("detail-line") || event.item.domain.substr(0,5) == "self.")
  {
    this.controller.stageController.pushScene("ArticleComments", event.item);
  }
  else
  {
    if(event.item.url.substr(-4) == ".mp3")
    {
      this.controller.serviceRequest('palm://com.palm.applicationManager',
      {
        method: 'launch',
        parameters:
        {
          target: event.item.url
        }
      });
    }
    else if(event.item.domain != "youtube.com")
    {
      this.controller.stageController.pushScene("WebView", event.item.url);
    }
    else
    {
      this.controller.serviceRequest("palm://com.palm.applicationManager",
      {
        method: "launch",
        parameters:
        {
          id: 'com.palm.app.youtube',
          params:
          {
            target: event.item.url
          }
        }
      });
    }
  }
}

MainAssistant.prototype.article_delete = function(event)
{
  this.hide_article(event.item);
}
MainAssistant.prototype.keep_alive = function()
{
  this.keepalive_timer = true;
  this.login;
}
