Preddit = (
{
  user: "",
  password: "",
  logged_in: false,
  has_mail: false,
  subreddit: "frontpage",
  category: "hot",
  subcategory: "",
  subreddits: new Array(),
  subscriptions: new Array(),
  api_loc: "http://www.reddit.com/api/",
  modhash: "",
  cookie: null,
  app_cookie: new Mojo.Model.Cookie("preddit"),
  app_db: null,
  get_stored: function()
  {
    this.app_db = new Mojo.Depot({name: "preddit", version: 1}, this.db_open_success.bind(this), this.db_open_failure.bind(this));
  },
  store_user: function(user, password)
  {
    this.user = user;
    this.password = password;
    this.app_db.add("login",
    {user: this.user, password: this.password},
    function() {Mojo.Log.error("login store OK");},
    function(error) {Mojo.Log.error("login store failed: ", error);});
  },
  get_time_elapsed: function(item_datetime_utc, current_datetime)
  {
    var item_datetime = new Date(Math.round(item_datetime_utc) * 1000);
    var current_seconds = current_datetime.getTime();
    var reply_seconds = item_datetime.getTime();
    var seconds_diff = current_seconds - reply_seconds;
    var datetime_diff = new Date(seconds_diff);
    var time_elapsed = "";
    var years_elapsed = (datetime_diff.getUTCFullYear() - 1970);
    var days_elapsed = datetime_diff.getUTCDate() - 1;
    if(years_elapsed > 0)
    {
      time_elapsed = years_elapsed + " year";
      if(datetime_diff.getUTCFullYear() > 1)
      {
        time_elapsed = time_elapsed + "s";
      }
    }
    else if(datetime_diff.getUTCMonth() > 0)
    {
      time_elapsed = datetime_diff.getUTCMonth() + " month";
      if(datetime_diff.getUTCMonth() > 1)
      {
        time_elapsed = time_elapsed + "s";
      }
    }
    else if(days_elapsed > 0)
    {
      time_elapsed = days_elapsed + " day";
      if(days_elapsed > 1)
      {
        time_elapsed = time_elapsed + "s";
      }
    }
    else if(datetime_diff.getUTCHours() > 0)
    {
      time_elapsed = datetime_diff.getUTCHours() + " hour";
      if(datetime_diff.getUTCHours() > 1)
      {
        time_elapsed = time_elapsed + "s";
      }
    }
    else if(datetime_diff.getUTCMinutes() > 0)
    {
      time_elapsed = datetime_diff.getUTCMinutes() + " minute";
      if(datetime_diff.getUTCMinutes() > 1)
      {
        time_elapsed = time_elapsed + "s";
      }
    }
    else
    {
      time_elapsed = datetime_diff.getUTCSeconds() + " second";
      if(datetime_diff.getUTCSeconds() > 1)
      {
        time_elapsed = time_elapsed + "s";
      }
    }
    return time_elapsed;
  },
  get_vote_classes: function(likes, score)
  {
    var arrow_up_class;
    var arrow_down_class;
    var score_class;
    var score_likes;
    var score_unvoted;
    var score_dislikes;
    if(likes === true)
    {
      arrow_up_class = "upmod";
      arrow_down_class = "down";
      score_class = "likes";
      score_unvoted = score - 1;
      score_likes = score;
      score_dislikes = score - 2; 
    }
    else if(likes === false)
    {
      arrow_down_class = "downmod";
      arrow_up_class = "up";
      score_class = "dislikes";      
      score_unvoted = score + 1;
      score_likes = score + 2;
      score_dislikes = score; 
    }
    else
    {
      arrow_up_class = "up";
      arrow_down_class = "down";
      score_class = "unvoted";
      score_unvoted = score;
      score_likes = score + 1;
      score_dislikes = score - 1; 
    }
    var arrow_up_class = (likes === true ? "upmod" : "up");
    var arrow_down_class = (likes === false ? "downmod" : "down");
    var score_class = (likes === true ? "likes" : likes === false ? "dislikes" : "unvoted");
    return {arrow_up_class: arrow_up_class, arrow_down_class: arrow_down_class, score_class: score_class, score_likes: score_likes, score_unvoted: score_unvoted, score_dislikes: score_dislikes};
  },
  add_commas: function(nStr)
  {
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1))
    {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  },
  db_open_success: function()
  {
     Mojo.Log.error("db_ok");
     this.app_db.get("login", this.get_db_info.bind(this), this.get_db_info_fail.bind(this));
  },
  db_open_failure: function(reason)
  {
    Mojo.Log.error("db_fail, reason: ", reason);
  },
  get_db_info: function(data)
  {
    if(data == undefined)
    {
      this.user = "";
      this.password = "";
    }
    else
    {
      this.user = data.user;
      this.password = data.password;
    }
  },
  get_db_info_fail: function(reason)
  {
    Mojo.Log.error("db_info_fail, reason: ", reason);
  },
  save_cookie: function()
  {
//    Preddit.app_cookie.put({user: Preddit.user, password: Preddit.password, subscriptions: Preddit.subscriptions});
    Preddit.app_cookie.put({user: Preddit.user, password: Preddit.password});
  },
  subscribed: function(id)
  {
    for(var x = 0; x < this.subscriptions.length; x++)
    {
      if(this.subscriptions[x].id == id || this.subscriptions[x].name == id)
      {
        return true;
      }
    }
    return false;
  },
  reddit_from_url: function(url)
  {
    var reddit_len = (url.length - 4); // Strip '/r/' and ending '/'
    if(url[url.length - 1] != "/")
    {
      reddit_len++;
    }
    var reddit = url.substr(3, reddit_len);
    return reddit;
  }
});