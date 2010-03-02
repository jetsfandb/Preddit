function SubredditsAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

SubredditsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
  this.mode = "popular"; // modes are: popular, new, myreddits
  this.myreddits_mode = ""; // modes are: subscriber, contributor, moderator
  this.reddits = new Array();
  this.subscription_changed = false;
  this.search_filter = "";
  this.reddits_index = 0;
  this.dir_text = "";
  this.controller.setupWidget("wait_spinner",
  this.attributes =
  {
    spinnerSize: 'large'
  },
  this.model =
  {
    spinning: false
  });
  this.controller.setupWidget("subreddit-list",
    this.attributes =
    {
      itemTemplate: "../../templates/subreddits-list-item",
      emptyTemplate: "../../templates/subreddit-list-empty",
      hasNoWidgets: true,
      fixedHeightItems: true
    },
    this.list_model =
    {
      items: this.reddits
    });
    this.reddits_model =
    {
      visible: true,
      label: $L('reddits'),
      id: "reddits_menu",
    // if before == id of 1st then no prev     
      items: 
      [
        {icon: "back", command: 'prev'},
        {},
        {},
        {icon: "search", command: 'search'},
        {},
        {},
        {icon: "forward", command: 'next'}
      ]
    };
    
    this.subreddit_tap = this.subreddit_tap.bindAsEventListener(this);
    Mojo.Event.listen(this.controller.get("subreddit-list"), Mojo.Event.listTap, this.subreddit_tap);
    this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, this.reddits_model);
    this.controller.setupWidget(Mojo.Menu.appMenu, {}, this.menu_model = 
    {
      visible: true, 
      items:
      [
        {label: "Popular", command: "mode_popular"},
        {label: "What's New", command: "mode_new"},
        {label: "my reddits", items: [ {label: "subscriber", command: "mode_myreddits_subscriber"},
                                       {label: "contributor", command: "mode_myreddits_contributor"},
                                       {label: "moderator", command: "mode_myreddits_moderator"}
                                     ]
        }
      ]
    });
}

SubredditsAssistant.prototype.handleCommand = function(event) {
  if(event.type == Mojo.Event.back)
  {
    if(this.subscription_changed)
    {
      event.stopPropagation();
      event.preventDefault();
      this.controller.stageController.popScene("refresh");
      return;
    }
  }
  if(event.type == Mojo.Event.command)
  {
    switch(event.command)
    {
      case "next":
        this.get_reddits("next");
        break;
        
      case "prev":
        this.get_reddits("prev");
        break;
        
      case "search":
        this.mode = "popular";
        this.get_search();
        break;
        
      case "mode_popular":
        this.search_filter = "";
        if(this.mode != "popular")
        {
          this.mode = "popular";
          this.get_reddits("first");
        }
        break;
        
      case "mode_new":
        this.search_filter = "";
        if(this.mode != "new")
        {
          this.mode = "new";
          this.get_reddits("first");
        }
        break;
        
      case "mode_myreddits_subscriber":
        this.search_filter = "";
        if(this.mode == "myreddits" && this.myreddits_mode == "subscriber")
        {
          break;
        }
        this.mode = "myreddits";
        this.myreddits_mode = "subscriber";
        this.get_reddits("first");
        break;
        
      case "mode_myreddits_contributor":
        this.search_filter = "";
        if(this.mode == "myreddits" && this.myreddits_mode == "contributor")
        {
          break;
        }
        this.mode = "myreddits";
        this.myreddits_mode = "contributor";
        this.get_reddits("first");
        break;
        
      case "mode_myreddits_moderator":
        this.search_filter = "";
        if(this.mode == "myreddits" && this.myreddits_mode == "moderator")
        {
          break;
        }        
        this.mode = "myreddits";
        this.myreddits_mode = "moderator";
        this.get_reddits("first");
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

SubredditsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
  this.get_reddits("first");
}


SubredditsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

SubredditsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
    Mojo.Event.stopListening(this.controller.get("subreddit-list"), Mojo.Event.listTap, this.subreddit_tap);
}

SubredditsAssistant.prototype.get_reddits = function(dir) {
  
  if(dir == "prev" && this.reddits_index == 0)
  {
    return;
  }
  this.controller.get("header-title").innerHTML = (this.mode);    
  this.operation = dir;
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var op = "http://www.reddit.com/reddits/";
  if(this.search_filter != "")
  {
    op = op + "search/";
    this.search_text = "q=" + this.search_filter;
    var search_title_text = "search: ";
    if(this.search_filter.length < 10)
    {
      search_title_text = search_title_text + this.search_filter;
    }
    else
    {
      search_title_text = search_title_text + this.search_filter.substr(0, 10) + "...";
    }
    this.controller.get("header-title").innerHTML = search_title_text;
  }
  else
  {
    this.search_text = "";
    if(this.mode == "new")
    {
      op = op + "new/"
//    this.controller.get("header-title").innerHTML = "new";
    }
    else if(this.mode == "myreddits")
    {
      var title_text = ("my reddits - " + this.myreddits_mode);
      this.controller.get("header-title").innerHTML = title_text;
      op = op + "mine/";
      if(this.myreddits_mode != "subscriber")
      {
        op = op + this.myreddits_mode + "/";
      }
    }
    else
    {
      //this.controller.get("header-title").innerHTML = "popular";
    }
  }
  op = op + ".json";
  var count = 0;
  if(this.operation == "next")
  {
    count = this.reddits_index + this.reddits.length;
    this.reddits_index += this.reddits.length;
    var l = this.reddits.length - 1;    
    this.dir_text = "after=" + this.reddits[this.reddits.length - 1].name;
  }
  else if(this.operation == "prev")
  {
    count = this.reddits_index + 1;
    this.reddits_index = ((this.reddits_index < this.reddits.length) ? 0 : this.reddits_index - this.reddits.length);
    this.dir_text = "before=" + this.reddits[0].name;
  }
  else if(this.operation == "refresh")
  {
    count = this.reddits_index;
  }
  var count_text = "count=" + count;
  if(this.operation != "first")
  {
    op = op + "?";
    if(this.search_text != "")
    {
      op = op + this.search_text;
    }
    if(this.operation != "search")
    {
      if(this.search_text != "")
      {
        op = op + "&";
      }
      op = op + this.dir_text + "&" + count_text;
    }
  }
  this.reddits = new Array();
  this.get_reddits_request = new Ajax.Request(op,
  {
    method: 'post',
    onSuccess: this.reddits_response.bind(this),
    onFailure: this.xmlhttp_fail_response.bind(this),
    onException: this.xmlhttp_exception.bind(this),
    onInteractive: this.reddits_response.bind(this)
  });
}

SubredditsAssistant.prototype.search_reddits = function(filter) {
  this.search_filter = filter;
  this.get_reddits("search");  
}
SubredditsAssistant.prototype.reddits_response = function(response)
{
//  Mojo.Log.info("response.readyState: ", response.readyState);
//  Mojo.Log.info("response.status: ", response.status);
  if(response.readyState != 4)
  {
    return;
  }
  if(response.status != 200 && response.status != 503)
  {
    // TODO add retry prompt for status == 0
    return;
  }
  this.controller.get("wait_spinner").mojo.stop();
  this.controller.get("scrim_spinner").style.display = "none";  
  var jsontext = eval('(' + response.responseText + ')');
  var reddit_list = jsontext["data"]["children"];
  var current_datetime = new Date();
  var list_length = reddit_list.length;
      for(var x = 0; x < list_length; x++)
  {
    var short_desc = "";
    if(reddit_list[x].data.description != null)
    {
      if (reddit_list[x].data.description.length > 80)
      {
        short_desc = (reddit_list[x].data.description.substr(0, 80) + "...");
      }
      else if(reddit_list[x].data.description.length > 0)
      {
        short_desc = reddit_list[x].data.description;
      }
      else
      {
        short_desc = "No description."
        reddit_list[x].data.description = "No description.";
      }
    }
    else
    {
      short_desc = "No description.";
      reddit_list[x].data.description = "No description.";
    }
    reddit_list[x].data.desc_status = "hide-desc";
    reddit_list[x].data.short_desc = short_desc;
    reddit_list[x].data.subscribers = Preddit.add_commas(reddit_list[x].data.subscribers);
    reddit_list[x].data.community_exist = Preddit.get_time_elapsed(reddit_list[x].data.created_utc, current_datetime);
    reddit_list[x].data.nsfw = (reddit_list[x].data.over18 ? "nsfw" : "sfw");
    if(Preddit.subscribed(reddit_list[x].data.name))
    {
      reddit_list[x].data.subscribe_action = "remove";
      reddit_list[x].data.subscribed_ind = "-";
    }
    else
    {
      reddit_list[x].data.subscribe_action = "add";
      reddit_list[x].data.subscribed_ind = "+";
    }
    this.reddits.push(reddit_list[x].data);
  }
  this.list_model.items = this.reddits;
  this.controller.modelChanged(this.list_model, this);
  if(this.operation == "first")
  {
    this.reddit_index = list_length;
  }
  else if(this.operation == "next")
  {
    this.reddit_index += list_length;
  }
  else if(this.operation == "prev")
  {
    this.reddit_index++;
  }
//  Mojo.Log.info(Mojo.Log.propertiesAsString(jsontext));
}

SubredditsAssistant.prototype.subscribe = function(id, action) {
  
  this.controller.get("scrim_spinner").style.display = "block";
  this.controller.get("wait_spinner").mojo.start();
  var path = "subscribe";
  var parameters =
  {
    sr: id,
    action: action,
    uh: Preddit.modhash
  };
  var op = Preddit.api_loc + path;
  this.subscribe_request = new Ajax.Request(op,
  {
    method: 'post',
    parameters: parameters,
    onSuccess: this.subscribe_response.bind(this),
    onFailure: this.xmlhttp_fail_response.bind(this),
    onException: this.xmlhttp_exception.bind(this),
    onInteractive: this.subscribe_response.bind(this)
  });
}

SubredditsAssistant.prototype.subscribe_response = function(response) {
  
//  Mojo.Log.info("response.readyState: ", response.readyState);
//  Mojo.Log.info("response.status: ", response.status);
  if(response.readyState != 4)
  {
    return;
  }
  if(response.status == 0)
  {
    this.controller.showAlertDialog(
    {
      onChoose: function(value) {if(value == "retry") this.subscribe(this.subscribe_request_item.action, this.subscribe_request_item.data.name);},
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
  if(response.status != 200)
  {
    return;
  }
  this.controller.get("wait_spinner").mojo.stop();
  this.controller.get("scrim_spinner").style.display = "none";
  var jsontext = eval('(' + response.responseText + ')');
  if(this.subscribe_request_item.action == "sub")
  {
    var subreddit = Preddit.reddit_from_url(this.subscribe_request_item.data.url);
    Preddit.subscriptions.push({id: this.subscribe_request_item.data.name, name: subreddit});
  }
  else
  {
    for(var x = 0; x < Preddit.subscriptions.length; x++)
    {
      if(Preddit.subscriptions[x].id == this.subscribe_request_item.data.name)
      {
        Preddit.subscriptions.splice(x, 1);
        break;
      }
    }
  }
  this.subscription_changed = true;
  this.get_reddits("refresh");
}

SubredditsAssistant.prototype.xmlhttp_fail_response = function(response)
{
  Mojo.Log.error("******************** xmlhttp_fail_response ********************");
  if(response['status'] == 503) // Search with no results can result in 503
  {
    return;
  }
  for (var i in response)
  {
    Mojo.Log.error("response[",i,"]: ",response[i]);
  }
}
SubredditsAssistant.prototype.xmlhttp_exception = function(requestor, exception)
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

SubredditsAssistant.prototype.get_search = function() {

  this.controller.showDialog(
    {
      template: '../../templates/subreddit-get-search',
      assistant: new SearchSubredditsAssistant(this),
      
      preventCancel: false
    });
}

SubredditsAssistant.prototype.subreddit_tap = function(event) {
  var element = this.controller.get(event.originalEvent.target);
  if(element.hasClassName("subreddit-desc-button"))
  {
    this.reddits[event.index].desc_status = (this.reddits[event.index].desc_status == "hide-desc" ? "" : "hide-desc");
    this.list_model.items = this.reddits;
    this.controller.modelChanged(this.list_model, this);
//  this.controller.get(event.originalEvent.target).innerHTML = (this.reddits[event.index].desc_status == "hide-desc" ? "+ Description" : "- Description");
    return;
  }
  else if(element.hasClassName("active") )
  {
    var action = this.reddits[event.index].subscribed_ind == "+" ? "sub" : "unsub";
    this.subscribe_request_item = {action: action, data: this.reddits[event.index]};
    this.subscribe(this.reddits[event.index].name, action);
    return;
  }
  Preddit.subreddit = event.item.url;
  this.controller.stageController.popScene("subreddit");
}

function SearchSubredditsAssistant(caller)
{
  this.controller = caller.controller;
  this.caller = caller;
}

SearchSubredditsAssistant.prototype.setup = function(widget)
{
  this.widget = widget;
  this.controller.setupWidget("search-text",
    this.attributes =
    {
      hintText: "Enter search text",
      textCase: Mojo.Widget.steModeLowerCase,
      focus: true
    },
    this.model =
    {
    });
  this.controller.setupWidget("search-button",
    this.attributes =
    {
    },
    this.model =
    {
      buttonClass: "affirmative",
      label: "Search"
    });
  this.save_search = this.save_search.bindAsEventListener(this);
  Mojo.Event.listen(this.controller.get("search-button"), Mojo.Event.tap, this.save_search);
}

SearchSubredditsAssistant.prototype.cleanup = function()
{
  Mojo.Event.stopListening(this.controller.get("search-button"), Mojo.Event.tap, this.save_search);
}
SearchSubredditsAssistant.prototype.save_search = function()
{
  var save_text = this.controller.get("search-text").mojo.getValue();
  save_text = save_text.replace(/^\s+|\s+$/g,'');

  if(save_text.length > 0)
  {
    this.caller.search_reddits(save_text);
  }
  else
  {
    this.caller.search_filter = "";
    this.caller.get_reddits("first");
  }
  this.widget.mojo.close();
}
