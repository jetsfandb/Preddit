var reddit = {ajax_domain: "www.reddit.com", post_site: "", cnameframe: 0, logged: false};

function open_menu(menu) {
    $j(menu).siblings(".drop-choices").not(".inuse").css("top", menu.offsetHeight + 'px').each(function () {
        $j(this).css("left", $j(menu).position().left + "px").css("top", ($j(menu).height() + $j(menu).position().top) + "px");
    }).addClass("active inuse");
};

function close_menus() {
    $j(".drop-choices.inuse").not(".active").removeClass("inuse");
    $j(".drop-choices.active").removeClass("active");
};

function hover_open_menu(menu) {};

function update_user(form) {
    try {
        var user = $j(form).find("input[name=user]").val();
        form.action += "/" + user;
    } catch(e) {}
    return true;
}

function post_user(form, where) {
    var user = $j(form).find("input[name=user]").val();
    if (user == null) {
        return post_form(form, where);
    } else {
        return post_form(form, where + '/' + user);
    }
}

function post_form(form, where, statusfunc, nametransformfunc, block) {
    try {
        if (statusfunc == null) statusfunc = function (x) {
            return reddit.status_msg.submitting;
        };
        $j(form).find(".error").not(".status").hide();
        $j(form).find(".status").html(statusfunc(form)).show();
        return simple_post_form(form, where, {},
        block);
    } catch(e) {
        return false;
    }
};

function get_form_fields(form, fields, filter_func) {
    fields = fields || {};
    if (!filter_func) filter_func = function (x) {
        return true;
    };
    $j(form).find("select, input, textarea").not(".gray, :disabled").each(function () {
        var type = $j(this).attr("type");
        if (filter_func(this) && ((type != "radio" && type != "checkbox") || $j(this).attr("checked"))) fields[$j(this).attr("name")] = $j(this).attr("value");
    });
    if (fields.id == null) {
        fields.id = $j(form).attr("id") ? ("#" + $j(form).attr("id")) : "";
    }
    return fields;
};

function form_error(form) {
    return function (r) {
        $j(form).find(".status").html("an error occurred while posting " + "(status: " + r.status + ")").end();
    }
}

function simple_post_form(form, where, fields, block) {
    $j.request(where, get_form_fields(form, fields), null, block, "json", false, form_error(form));
    return false;
};

function post_pseudo_form(form, where, block) {
    var filter_func = function (x) {
        var parent = $j(x).parents("form:first");
        return (parent.length == 0 || parent.get(0) == $j(form).get(0))
    };
    $j(form).find(".error").not(".status").hide();
    $j(form).find(".status").html(reddit.status_msg.submitting).show();
    $j.request(where, get_form_fields(form, {},
    filter_func), null, block, "json", false, form_error(form));
    return false;
}

function emptyInput(elem, msg) {
    if (!$j(elem).attr("value") || $j(elem).attr("value") == msg) $j(elem).addClass("gray").attr("value", msg).attr("rows", 3);
    else $j(elem).focus(function () {});
};

function showlang() {
    $j(".lang-popup:first").show();
    return false;
};

function showcover(warning, reason) {
    $j.request("new_captcha");
    if (warning) $j("#cover_disclaim, #cover_msg").show();
    else $j("#cover_disclaim, #cover_msg").hide();
    $j(".login-popup:first").show().find("form input[name=reason]").attr("value", (reason || ""));
    return false;
};

function hidecover(where) {
    $j(where).parents(".cover-overlay").hide();
    return false;
};

function deleteRow(elem) {
    $j(elem).delete_table_row();
};

function change_state(elem, op, callback, keep) {
    var form = $j(elem).parents("form");
    var id = form.find("input[name=id]");
    if (id.length) id = id.attr("value");
    else id = $j(elem).thing_id();
    simple_post_form(form, op, {
        id: id
    });
    if (callback) callback(form, op);
    if (!$j.defined(keep)) {
        form.html(form.attr("executed").value);
    }
    return false;
};

function unread_thing(elem) {
    var t = $j(elem);
    if (!t.hasClass("thing")) {
        t = t.thing();
    }
    $j(t).addClass("new unread");
}

function read_thing(elem) {
    var t = $j(elem);
    if (!t.hasClass("thing")) {
        t = t.thing();
    }
    $j(t).removeClass("new");
    $j.request("read_message", {
        "id": $j(t).thing_id()
    });
}

function save_thing(elem) {
    $j(elem).thing().addClass("saved");
}

function unsave_thing(elem) {
    $j(elem).thing().removeClass("saved");
}

function click_thing(elem) {
    var t = $j(elem);
    if (!t.hasClass("thing")) {
        t = t.thing();
    }
    if (t.hasClass("message") && t.hasClass("recipient")) {
        if (t.hasClass("unread")) {
            t.removeClass("unread");
        } else if (t.hasClass("new")) {
            read_thing(elem);
        }
    }
}

function hide_thing(elem) {
    var thing = $j(elem).thing();
    thing.hide();
    if (thing.hasClass("hidden")) thing.removeClass("hidden");
    else thing.addClass("hidden");
};

function toggle_label(elem, callback, cancelback) {
    $j(elem).parent().find(".option").toggle();
    $j(elem).onclick = function () {
        return (toggle_label(elem, cancelback, callback));
    }
    if (callback) callback(elem);
}

function toggle(elem, callback, cancelback) {
    var self = $j(elem).parent().andSelf().filter(".option");
    var sibling = self.removeClass("active").siblings().addClass("active").get(0);
    if (cancelback && !sibling.onclick) {
        sibling.onclick = function () {
            return toggle(sibling, cancelback, callback);
        }
    }
    if (callback) callback(elem);
    return false;
};

function cancelToggleForm(elem, form_class, button_class, on_hide) {
    if (button_class && $j(elem).filter("button").length) {
        var sel = $j(elem).thing().find(button_class).children(":visible").filter(":first");
        toggle(sel);
    }
    $j(elem).thing().find(form_class).each(function () {
        if (on_hide) on_hide($j(this));
        $j(this).hide().remove();
    });
    return false;
};

function get_organic(elem, next) {
    var listing = $j(elem).parents(".organic-listing");
    var thing = listing.find(".thing:visible");
    if (listing.find(":animated").length) return false;
    var next_thing;
    if (next) {
        next_thing = thing.nextAll(".thing:not(.stub)").filter(":first");
        if (next_thing.length == 0) next_thing = thing.siblings(".thing:not(.stub)").filter(":first");
    } else {
        next_thing = thing.prevAll(".thing:not(.stub)").filter(":first");
        if (next_thing.length == 0) next_thing = thing.siblings(".thing:not(.stub)").filter(":last");
    }
    thing.fadeOut('fast', function () {
        if (next_thing.length) next_thing.fadeIn('fast', function () {
            var n = 5;
            var t = thing;
            var to_fetch = [];
            for (var i = 0; i < 2 * n; i++) {
                t = (next) ? t.nextAll(".thing:first") : t.prevAll(".thing:first");
                if (t.length == 0) t = t.end().parent().children((next) ? ".thing:first" : ".thing:last");
                if (t.filter(".stub").length) to_fetch.push(t.thing_id());
                if (i >= n && to_fetch.length == 0) break;
            }
            if (to_fetch.length) {
                $j.request("fetch_links", {
                    links: to_fetch.join(','),
                    listing: listing.attr("id")
                });
            }
        })
    });
};

function linkstatus(form) {
    return reddit.status_msg.submitting;
};

function subscribe(reddit_name) {
    return function () {
        if (!reddit.logged) {
            showcover();
        } else {
            $j.things(reddit_name).find(".entry").addClass("likes");
            $j.request("subscribe", {
                sr: reddit_name,
                action: "sub"
            });
        }
    };
};

function unsubscribe(reddit_name) {
    return function () {
        if (!reddit.logged) {
            showcover();
        } else {
            $j.things(reddit_name).find(".entry").removeClass("likes");
            $j.request("subscribe", {
                sr: reddit_name,
                action: "unsub"
            });
        }
    };
};

function friend(user_name, container_name, type) {
    return function () {
        if (!reddit.logged) {
            showcover();
        } else {
            $j.request("friend", {
                name: user_name,
                container: container_name,
                type: type
            });
        }
    }
};

function unfriend(user_name, container_name, type) {
    return function () {
        $j.request("unfriend", {
            name: user_name,
            container: container_name,
            type: type
        });
    }
};

function share(elem) {
    $j.request("new_captcha");
    $j(elem).new_thing_child($j(".sharelink:first").clone(true).attr("id", "sharelink_" + $j(elem).thing_id()), false);
    $j.request("new_captcha");
};

function cancelShare(elem) {
    return cancelToggleForm(elem, ".sharelink", ".share-button");
};

function reject_promo(elem) {
    $j(elem).thing().find(".rejection-form").show().find("textare").focus();
}

function cancel_reject_promo(elem) {
    $j(elem).thing().find(".rejection-form").hide();
}

function complete_reject_promo(elem) {
    $j(elem).thing().removeClass("accepted").addClass("rejected").find(".reject_promo").remove();
}

function helpon(elem) {
    $j(elem).parents(".usertext-edit:first").children(".markhelp:first").show();
};

function helpoff(elem) {
    $j(elem).parents(".usertext-edit:first").children(".markhelp:first").hide();
};

function show_all_messages(elem) {
    var m = $j(elem).parents(".message");
    var ids = [];
    m.find(".entry .collapsed").hide().end().find(".noncollapsed, .midcol:first").filter(":hidden").each(function () {
        var t = $j(this).show().thing_id();
        if (ids.indexOf(t) == -1) {
            ids.push(t);
        }
    });
    if (ids.length) {
        $j.request("uncollapse_message", {
            "id": ids.join(',')
        });
    }
    return false;
}

function hide_all_messages(elem) {
    var m = $j(elem).parents(".message");
    var ids = [];
    m.find(".entry .collapsed").show().end().find(".noncollapsed, .midcol:first").filter(":visible").each(function () {
        var t = $j(this).hide().thing_id();
        if (ids.indexOf(t) == -1) {
            ids.push(t);
        }
    });
    if (ids.length) {
        $j.request("collapse_message", {
            "id": ids.join(',')
        });
    }
    return false;
}

function hidecomment(elem) {
    var t = $j(elem).thing();
    t.hide().find(".noncollapsed:first, .midcol:first").hide().end().show().find(".entry:first .collapsed").show();
    if (t.hasClass("message")) {
        $j.request("collapse_message", {
            "id": $j(t).thing_id()
        });
    } else {
        t.find(".child:first").hide();
    }
    return false;
};

function showcomment(elem) {
    var t = $j(elem).thing();
    t.find(".entry:first .collapsed").hide().end().find(".noncollapsed:first, .midcol:first").show().end().show();
    if (t.hasClass("message")) {
        $j.request("uncollapse_message", {
            "id": $j(t).thing_id()
        });
    } else {
        t.find(".child:first").show();
    }
    return false;
};

function morechildren(form, link_id, children, depth) {
    $j(form).html(reddit.status_msg.loading).css("color", "red");
    var id = $j(form).parents(".thing.morechildren:first").thing_id();
    $j.request('morechildren', {
        link_id: link_id,
        children: children,
        depth: depth,
        id: id
    });
    return false;
};

function moremessages(elem) {
    $j(elem).html(reddit.status_msg.loading).css("color", "red");
    $j.request("moremessages", {
        parent_id: $j(elem).thing_id()
    });
    return false;
}

function update_reddit_count(site) {
    if (!site || !reddit.logged) return;
    var decay_factor = .9;
    var decay_period = 86400;
    var num_recent = 10;
    var num_count = 100;
    var date_key = '_date';
    var cur_date = new Date();
    var count_cookie = 'reddit_counts';
    var recent_cookie = 'recent_reddits';
    var reddit_counts = $j.cookie_read(count_cookie).data;
    if (!$j.defined(reddit_counts)) {
        reddit_counts = {};
        reddit_counts[date_key] = cur_date.toString();
    }
    var last_reset = new Date(reddit_counts[date_key]);
    var decay = cur_date - last_reset > decay_period * 1000;
    reddit_counts[site] = $j.with_default(reddit_counts[site], 0) + 1;
    var names = [];
    $j.each(reddit_counts, function (sr_name, value) {
        if (sr_name != date_key) {
            if (decay && sr_name != site) {
                var val = Math.floor(decay_factor * reddit_counts[sr_name]);
                if (val > 0) reddit_counts[sr_name] = val;
                else delete reddit_counts[sr_name];
            }
            if (reddit_counts[sr_name]) names.push(sr_name);
        }
    });
    names.sort(function (n1, n2) {
        return reddit_counts[n2] - reddit_counts[n1];
    });
    if (decay) reddit_counts[date_key] = cur_date.toString();
    var recent_reddits = "";
    for (var i = 0; i < names.length; i++) {
        var sr_name = names[i];
        if (i < num_recent) {
            recent_reddits += names[i] + ',';
        } else if (i >= num_count && sr_name != site) {
            delete reddit_counts[sr_name];
        }
    }
    $j.cookie_write({
        name: count_cookie,
        data: reddit_counts
    });
    if (recent_reddits) $j.cookie_write({
        name: recent_cookie,
        data: recent_reddits
    });
};

function add_thing_to_cookie(thing, cookie_name) {
    var id = $j(thing).thing_id();
    if (id && id.length) {
        return add_thing_id_to_cookie(id, cookie_name);
    }
}

function add_thing_id_to_cookie(id, cookie_name) {
    var cookie = $j.cookie_read(cookie_name);
    if (!cookie.data) {
        cookie.data = "";
    }
    if (cookie.data.substring(0, id.length) == id) {
        return;
    }
    cookie.data = id + ',' + cookie.data;
    if (cookie.data.length > 1000) {
        var fullnames = cookie.data.split(',');
        fullnames = $j.uniq(fullnames, 20);
        cookie.data = fullnames.join(',');
    }
    $j.cookie_write(cookie);
};

function clicked_items() {
    var cookie = $j.cookie_read('recentclicks2');
    if (cookie && cookie.data) {
        var fullnames = cookie.data.split(",");
        for (var i = fullnames.length - 1; i >= 0; i--) {
            if (!fullnames[i] || !fullnames[i].length) {
                fullnames.splice(i, 1);
            }
        }
        return fullnames;
    } else {
        return [];
    }
}

function clear_clicked_items() {
    var cookie = $j.cookie_read('recentclicks2');
    cookie.data = '';
    $j.cookie_write(cookie);
    $j('.gadget').remove();
}

function updateEventHandlers(thing) {
    thing = $j(thing);
    var listing = thing.parent();
    $j(thing).filter(".promotedlink, .sponsorshipbox").bind("onshow", function () {
        var id = $j(this).thing_id();
        if ($j.inArray(id, reddit.tofetch) != -1) {
            $j.request("onload", {
                ids: reddit.tofetch.join(",")
            });
            reddit.tofetch = [];
        }
        var tracker = reddit.trackers[id];
        if ($j.defined(tracker)) {
            $j(this).find("a.title").attr("href", tracker.click).end().find("a.thumbnail").attr("href", tracker.click).end().find("img.promote-pixel").attr("src", tracker.show);
            delete reddit.trackers[id];
        }
    }).filter(":visible").trigger("onshow");
    $j(thing).filter(".link").find("a.title, a.comments").mousedown(function () {
        var sr = reddit.sr[$j(this).thing_id()] || reddit.cur_site;
        update_reddit_count(sr);
        $j(this).addClass("click");
        add_thing_to_cookie(this, "recentclicks2");
        var wasorganic = $j(this).parents('.organic-listing').length > 0;
        last_click(thing, wasorganic);
    });
    if (listing.filter(".organic-listing").length) {
        thing.find(".hide-button a, .del-button a.yes, .report-button a.yes").each(function () {
            $j(this).get(0).onclick = null
        });
        thing.find(".hide-button a").click(function () {
            var a = $j(this).get(0);
            change_state(a, 'hide', function () {
                get_organic(a, 1);
            });
        });
        thing.find(".del-button a.yes").click(function () {
            var a = $j(this).get(0);
            change_state(a, 'del', function () {
                get_organic(a, 1);
            });
        });
        thing.find(".report-button a.yes").click(function () {
            var a = $j(this).get(0);
            change_state(a, 'report', function () {
                get_organic(a, 1);
            });
        });
    }
};

function last_click(thing, organic) {
    var cookie = "last_thing";
    if (thing) {
        var data = {
            href: window.location.href,
            what: $j(thing).thing_id(),
            organic: organic
        };
        $j.cookie_write({
            name: cookie,
            data: data
        });
    } else {
        var current = $j.cookie_read(cookie).data;
        if (current && current.href == window.location.href) {
            var olisting = $j('.organic-listing');
            if (current.organic && olisting.length == 1) {
                if (olisting.find('.thing:visible').thing_id() == current.what) {} else {
                    var thing = olisting.things(current.what);
                    if (thing.length > 0 && !thing.hasClass('stub')) {
                        olisting.find('.thing:visible').hide();
                        thing.show();
                    } else {
                        thing.remove();
                        olisting.find('.thing:visible').before('<div class="thing id-' + current.what + ' stub" style="display: none"></div');
                        $j.request('fetch_links', {
                            links: [current.what],
                            show: current.what,
                            listing: olisting.attr('id')
                        });
                    }
                }
            }
            $j.things(current.what).addClass("last-clicked");
            $j.cookie_write({
                name: cookie,
                data: ""
            });
        }
    }
};

function login(elem) {
    if (cnameframe) return true;
    return post_user(this, "login");
};

function register(elem) {
    if (cnameframe) return true;
    return post_user(this, "register");
};

function fetch_title() {
    var url_field = $j("#url-field");
    var error = url_field.find(".NO_URL");
    var status = url_field.find(".title-status");
    var url = $j("#url").val();
    if (url) {
        status.show().text(reddit.status_msg.loading);
        error.hide();
        $j.request("fetch_title", {
            url: url
        });
    } else {
        status.hide();
        error.show().text("a url is required");
    }
}

function sr_cache() {
    if (!$j.defined(reddit.sr_cache)) {
        reddit.sr_cache = new Array();
    }
    return reddit.sr_cache;
}

function highlight_reddit(item) {
    $j("#sr-drop-down").children('.sr-selected').removeClass('sr-selected');
    if (item) {
        $j(item).addClass('sr-selected');
    }
}

function update_dropdown(sr_names) {
    var drop_down = $j("#sr-drop-down");
    if (!sr_names.length) {
        drop_down.hide();
        return;
    }
    var first_row = drop_down.children(":first");
    first_row.removeClass('sr-selected');
    drop_down.children().remove();
    $j.each(sr_names, function (i) {
        if (i > 10) return;
        var name = sr_names[i];
        var new_row = first_row.clone();
        new_row.text(name);
        drop_down.append(new_row);
    });
    var height = $j("#sr-autocomplete").outerHeight();
    drop_down.css('top', height);
    drop_down.show();
}

function sr_search(query) {
    query = query.toLowerCase();
    var cache = sr_cache();
    if (!cache[query]) {
        $j.request('search_reddit_names', {
            query: query
        },


        function (r) {
            cache[query] = r['names'];
            update_dropdown(r['names']);
        });
    } else {
        update_dropdown(cache[query]);
    }
}

function sr_name_up(e) {
    var new_sr_name = $j("#sr-autocomplete").val();
    var old_sr_name = window.old_sr_name || '';
    window.old_sr_name = new_sr_name;
    if (new_sr_name == '') {
        hide_sr_name_list();
    } else if (e.keyCode == 38 || e.keyCode == 40 || e.keyCode == 9) {} else if (e.keyCode == 27 && reddit.orig_sr) {
        $j("#sr-autocomplete").val(reddit.orig_sr);
        hide_sr_name_list();
    } else if (new_sr_name != old_sr_name) {
        reddit.orig_sr = new_sr_name;
        sr_search($j("#sr-autocomplete").val());
    }
}

function sr_name_down(e) {
    var input = $j("#sr-autocomplete");
    if (e.keyCode == 38 || e.keyCode == 40) {
        var dir = e.keyCode == 38 && 'up' || 'down';
        var cur_row = $j("#sr-drop-down .sr-selected:first");
        var first_row = $j("#sr-drop-down .sr-name-row:first");
        var last_row = $j("#sr-drop-down .sr-name-row:last");
        var new_row = null;
        if (dir == 'down') {
            if (!cur_row.length) new_row = first_row;
            else if (cur_row.get(0) == last_row.get(0)) new_row = null;
            else new_row = cur_row.next(':first');
        } else {
            if (!cur_row.length) new_row = last_row;
            else if (cur_row.get(0) == first_row.get(0)) new_row = null;
            else new_row = cur_row.prev(':first');
        }
        highlight_reddit(new_row);
        if (new_row) {
            input.val($j.trim(new_row.text()));
        } else {
            input.val(reddit.orig_sr);
        }
        return false;
    } else if (e.keyCode == 13) {
        hide_sr_name_list();
        input.parents("form").submit();
        return false;
    }
}

function hide_sr_name_list(e) {
    $j("#sr-drop-down").hide();
}

function sr_dropdown_mdown(row) {
    reddit.sr_mouse_row = row;
    return false;
}

function sr_dropdown_mup(row) {
    if (reddit.sr_mouse_row == row) {
        var name = $j(row).text();
        $j("#sr-autocomplete").val(name);
        $j("#sr-drop-down").hide();
    }
}

function set_sr_name(link) {
    var name = $j(link).text();
    $j("#sr-autocomplete").trigger('focus').val(name);
}

function select_form_tab(elem, to_show, to_hide) {
    var link_parent = $j(elem).parent();
    link_parent.addClass('selected').siblings().removeClass('selected');
    var content = link_parent.parent('ul').next('.formtabs-content');
    content.find(to_show).show().find(":input").removeAttr("disabled").end();
    content.find(to_hide).hide().find(":input").attr("disabled", true);
}

function expando_cache() {
    if (!$j.defined(reddit.thing_child_cache)) {
        reddit.thing_child_cache = new Array();
    }
    return reddit.thing_child_cache;
}

function expando_child(elem) {
    var child_cache = expando_cache();
    var thing = $j(elem).thing();
    var button = thing.find(".expando-button");
    button.addClass("expanded").removeClass("collapsed").get(0).onclick = function () {
        unexpando_child(elem)
    };
    var expando = thing.find(".expando");
    var key = thing.thing_id() + "_cache";
    if (!child_cache[key]) {
        $j.request("expando", {
            "link_id": thing.thing_id()
        },


        function (r) {
            child_cache[key] = r;
            expando.html($j.unsafe(r));
        },
        false, "html");
    } else {
        expando.html($j.unsafe(child_cache[key]));
    }
    expando.show();
}

function unexpando_child(elem) {
    var thing = $j(elem).thing();
    var button = thing.find(".expando-button");
    button.addClass("collapsed").removeClass("expanded").get(0).onclick = function () {
        expando_child(elem)
    };
    thing.find(".expando").hide().empty();
}

function show_edit_usertext(form) {
    var edit = form.find(".usertext-edit");
    var body = form.find(".usertext-body");
    var textarea = edit.find('div > textarea');
    var body_width = Math.max(body.children(".md").width(), 500);
    var body_height = Math.max(body.children(".md").height(), 100);
    body.hide();
    edit.show();
    textarea.css('width', '');
    textarea.css('height', '');
    if (textarea.get(0).scrollHeight > textarea.height()) {
        var new_width = Math.max(body_width - 5, textarea.width());
        textarea.width(new_width);
        edit.width(new_width);
        var new_height = Math.max(body_height, textarea.height());
        textarea.height(new_height);
    }
    form.find(".cancel, .save").show().end().find(".help-toggle").show().end();
    textarea.focus();
}

function hide_edit_usertext(form) {
    form.find(".usertext-edit").hide().end().find(".usertext-body").show().end().find(".cancel, .save").hide().end().find(".help-toggle").hide().end().find(".markhelp").hide().end()
}

function comment_reply_for_elem(elem) {
    elem = $j(elem);
    var thing = elem.thing();
    var thing_id = elem.thing_id();
    var form = thing.find(".child .usertext:first");
    if (!form.length || form.parent().thing_id() != thing.thing_id()) {
        form = $j(".usertext.cloneable:first").clone(true);
        elem.new_thing_child(form);
        form.attr("thing_id").value = thing_id;
        form.attr("id", "commentreply_" + thing_id);
        form.find(".error").hide();
    }
    return form;
}

function edit_usertext(elem) {
    var t = $j(elem).thing();
    t.find(".edit-usertext:first").parent("li").andSelf().hide();
    show_edit_usertext(t.find(".usertext:first"));
}

function cancel_usertext(elem) {
    var t = $j(elem).thing();
    t.find(".edit-usertext:first").parent("li").andSelf().show();
    hide_edit_usertext(t.find(".usertext:first"));
}

function save_usertext(elem) {
    var t = $j(elem).thing();
    t.find(".edit-usertext:first").parent("li").andSelf().show();
}

function reply(elem) {
    var form = comment_reply_for_elem(elem);
    show_edit_usertext(form);
    form.show();
    form.find(".cancel").get(0).onclick = function () {
        form.hide()
    };
}

function toggle_distinguish_span(elem) {
    var form = $j(elem).parents("form")[0];
    $j(form).children().toggle();
}

function set_distinguish(elem, value) {
    change_state(elem, "distinguish/" + value);
    $j(elem).children().toggle();
}

function populate_click_gadget() {
    if ($j('.click-gadget').length) {
        var clicked = clicked_items();
        if (clicked && clicked.length) {
            clicked = $j.uniq(clicked, 5);
            clicked.sort();
            $j.request('gadget/click/' + clicked.join(','), undefined, undefined, undefined, "json", true);
        }
    }
}
var toolbar_p = function (expanded_size, collapsed_size) {
    this.toggle_linktitle = function (s) {
        $j('.title, .submit, .url, .linkicon').toggle();
        if ($j(s).is('.pushed-button')) {
            $j(s).parents('.middle-side').removeClass('clickable');
        } else {
            $j(s).parents('.middle-side').addClass('clickable');
            $j('.url').children('form').children('input').focus().select();
        }
        return this.toggle_pushed(s);
    };
    this.toggle_pushed = function (s) {
        s = $j(s);
        if (s.is('.pushed-button')) {
            s.removeClass('pushed-button').addClass('popped-button');
        } else {
            s.removeClass('popped-button').addClass('pushed-button');
        }
        return false;
    };
    this.push_button = function (s) {
        $j(s).removeClass("popped-button").addClass("pushed-button");
    };
    this.pop_button = function (s) {
        $j(s).removeClass("pushed-button").addClass("popped-button");
    };
    this.serendipity = function () {
        this.push_button('.serendipity');
        return true;
    };
    this.show_panel = function () {
        parent.inner_toolbar.document.body.cols = expanded_size;
    };
    this.hide_panel = function () {
        parent.inner_toolbar.document.body.cols = collapsed_size;
    };
    this.resize_toolbar = function () {
        var height = $j("body").height();
        parent.document.body.rows = height + "px, 100%";
    };
    this.login_msg = function () {
        $j(".toolbar-status-bar").show();
        $j(".login-arrow").show();
        this.resize_toolbar();
        return false;
    };
    this.top_window = function () {
        var w = window;
        while (w != w.parent) {
            w = w.parent;
        }
        return w.parent;
    };
    var pop_obj = null;
    this.panel_loadurl = function (url) {
        try {
            var cur = window.parent.inner_toolbar.reddit_panel.location;
            if (cur == url) {
                return false;
            } else {
                if (pop_obj != null) {
                    this.pop_button(pop_obj);
                    pop_obj = null;
                }
                return true;
            }
        } catch(e) {
            return true;
        }
    };
    var comments_on = 0;
    this.comments_pushed = function (ctl) {
        comments_on = !comments_on;
        if (comments_on) {
            this.push_button(ctl);
            this.show_panel();
        } else {
            this.pop_button(ctl);
            this.hide_panel();
        }
    };
    this.gourl = function (form, base_url) {
        var url = $j(form).find('input[type=text]').attr('value');
        var newurl = base_url + escape(url);
        this.top_window().location.href = newurl;
        return false;
    };
    this.pref_commentspanel_hide = function () {
        $j.request('tb_commentspanel_hide');
    };
    this.pref_commentspanel_show = function () {
        $j.request('tb_commentspanel_show');
    };
};

function clear_all_langs(elem) {
    $j(elem).parents("td").find("input[type=checkbox]").attr("checked", false);
}

function check_some_langs(elem) {
    $j(elem).parents("td").find("#some-langs").attr("checked", true);
}

function fetch_parent(elem, parent_permalink, parent_id) {
    $j(elem).css("color", "red").html(reddit.status_msg.loading);
    var thing = $j(elem).thing();
    var parentdiv = thing.find(".uncollapsed .parent");
    if (parentdiv.length == 0) {
        var parent = '';
        $j.getJSON(parent_permalink, function (response) {
            $j.each(response, function () {
                if (this && this.data.children) {
                    $j.each(this.data.children, function () {
                        if (this.data.name == parent_id) {
                            parent = this.data.body_html;
                        }
                    });
                }
            });
            if (parent) {
                thing.find(".noncollapsed .md").before('<div class="parent rounded">' + $j.unsafe(parent) + '</div>');
            }
            $j(elem).parent("li").andSelf().remove();
        });
    }
    return false;
}
$j(function () {
    $j("body").set_thing_init(updateEventHandlers);
    $j("textarea.gray, input.gray").focus(function () {
        $j(this).attr("rows", 7).filter(".gray").removeClass("gray").attr("value", "")
    });
    if (reddit.logged) {
        $j.cookie_name_prefix(reddit.logged);
    } else {}
    $j.default_cookie_domain(reddit.cur_domain.split(':')[0]);
    if (reddit.cur_site) update_reddit_count(reddit.cur_site);
    last_click();
});