(function ($) {
    $.log = function (message) {
        if (window.console) {
            if (window.console.debug) window.console.debug(message);
            else if (window.console.log) window.console.log(message);
        } else alert(message);
    };
    $.debug = function (message) {
        if ($.with_default(reddit.debug, false)) {
            return $.log(message);
        }
    }
    $.fn.debug = function () {
        $.debug($(this));
        return $(this);
    }
    $.redirect = function (dest) {
        window.location = dest;
    };
    $.fn.redirect = function (dest) {
        $(this).filter("form").find(".status").show().html("redirecting...");
        var target = $(this).attr('target');
        if (target == "_top") {
            var w = window;
            while (w != w.parent) {
                w = w.parent;
            }
            w.location = dest;
        } else {
            $.redirect(dest);
        }
        return $(this)
    }
    $.refresh = function () {
        window.location.reload(true);
    };
    $.defined = function (value) {
        return (typeof(value) != "undefined");
    };
    $.with_default = function (value, alt) {
        return $.defined(value) ? value : alt;
    };
    $.unsafe = function (text) {
        if (typeof(text) == "string") {
            text = text.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
        }
        return (text || "");
    };
    $.uniq = function (list, max) {
        var ret = [];
        var seen = {};
        var num = max ? max : list.length;
        for (var i = 0; i < list.length && ret.length < num; i++) {
            if (!seen[list[i]]) {
                seen[list[i]] = true;
                ret.push(list[i]);
            }
        }
        return ret;
    };
    (function (show, hide) {
        $.fn.show = function (speed, callback) {
            $(this).trigger("onshow");
            return show.call(this, speed, callback);
        }
        $.fn.hide = function (speed, callback) {
            $(this).trigger("onhide");
            return hide.call(this, speed, callback);
        }
    })($.fn.show, $.fn.hide);
    var _ajax_locks = {};

    function acquire_ajax_lock(op) {
        if (_ajax_locks[op]) {
            return false;
        }
        _ajax_locks[op] = true;
        return true;
    };

    function release_ajax_lock(op) {
        delete _ajax_locks[op];
    };

    function handleResponse(action) {
        return function (r) {
            if (r.jquery) {
                var objs = {};
                objs[0] = jQuery;
                $.map(r.jquery, function (q) {
                    var old_i = q[0],
                        new_i = q[1],
                        op = q[2],
                        args = q[3];
                    for (var i = 0; args.length && i < args.length; i++)
                    args[i] = $.unsafe(args[i]);
                    if (op == "call") objs[new_i] = objs[old_i].apply(objs[old_i]._obj, args);
                    else if (op == "attr") {
                        objs[new_i] = objs[old_i][args];
                        if (objs[new_i]) objs[new_i]._obj = objs[old_i];
                        else {
                            $.debug("unrecognized");
                        }
                    } else {
                        $.debug("unrecognized");
                    }
                });
            }
        };
    };
    var api_loc = 'http://' + reddit.ajax_domain + '/api/';
    $.request = function (op, parameters, worker_in, block, type, get_only, errorhandler) {
        var action = op;
        var worker = worker_in;
        if (rate_limit(op)) return;
        var have_lock = !$.with_default(block, false) || acquire_ajax_lock(action);
        parameters = $.with_default(parameters, {});
        worker_in = $.with_default(worker_in, handleResponse(action));
        type = $.with_default(type, "json");
        if (typeof(worker_in) != 'function') worker_in = handleResponse(action);
        var worker = function (r) {
            release_ajax_lock(action);
            return worker_in(r);
        };
        errorhandler_in = $.with_default(errorhandler, function () {});
        errorhandler = function (r) {
            release_ajax_lock(action);
            return errorhandler_in(r);
        };
        get_only = $.with_default(get_only, false);
        if (reddit.post_site) parameters.r = reddit.post_site;
        if (reddit.cnameframe) parameters.cnameframe = 1;
        if (reddit.logged) parameters.uh = reddit.modhash;
        if (have_lock) {
            op = api_loc + op;
            $.ajax({
                type: (get_only) ? "GET" : "POST",
                url: op,
                data: parameters,
                success: worker,
                error: errorhandler,
                dataType: type
            });
        }
    };
    var up_cls = "up";
    var upmod_cls = "upmod";
    var down_cls = "down";
    var downmod_cls = "downmod";
    rate_limit = function () {
        var default_rate_limit = 333;
        var rate_limits = {
            "vote": 333,
            "comment": 5000,
            "ignore": 0,
            "ban": 0,
            "unban": 0
        };
        var last_dates = {};
        var defined = $.defined;
        var with_default = $.with_default;
        var _Date = Date;
        return function (action) {
            var now = new _Date();
            var last_date = last_dates[action];
            var allowed_interval = with_default(rate_limits[action], default_rate_limit);
            last_dates[action] = now;
            return (defined(last_date) && now - last_date < allowed_interval)
        };
    }()
    $.fn.vote = function (vh, callback, event) {
        if ($(this).hasClass("arrow")) {
            var dir = ($(this).hasClass(up_cls) ? 1 : ($(this).hasClass(down_cls) ? -1 : 0));
            var things = $(this).all_things_by_id();
            var arrows = things.children().not(".child").find('.arrow');
            var u_before = (dir == 1) ? up_cls : upmod_cls;
            var u_after = (dir == 1) ? upmod_cls : up_cls;
            arrows.filter("." + u_before).removeClass(u_before).addClass(u_after);
            var d_before = (dir == -1) ? down_cls : downmod_cls;
            var d_after = (dir == -1) ? downmod_cls : down_cls;
            arrows.filter("." + d_before).removeClass(d_before).addClass(d_after);
            if (reddit.logged) {
                things.each(function () {
                    var entry = $(this).find(".entry:first, .midcol:first");
                    if (dir > 0) entry.addClass('likes').removeClass('dislikes unvoted');
                    else if (dir < 0) entry.addClass('dislikes').removeClass('likes unvoted');
                    else entry.addClass('unvoted').removeClass('likes dislikes');
                });
                var thing_id = things.filter(":first").thing_id();
                vh += event ? "" : ("-" + thing_id);
                $.request("vote", {
                    id: thing_id,
                    dir: dir,
                    vh: vh
                });
            }
            if (callback) callback(things, dir);
        }
    };
    $.fn.thing = function () {
        return this.parents(".thing:first");
    };
    $.fn.all_things_by_id = function () {
        return this.thing().add($.things(this.thing_id()));
    };
    $.fn.thing_id = function () {
        var t = (this.hasClass("thing")) ? this : this.thing();
        if (t.length) {
            var id = $.grep(t.get(0).className.split(' '), function (i) {
                return i.match(/^id-/);
            });
            return (id.length) ? id[0].slice(3, id[0].length) : "";
        }
        return "";
    };
    $.things = function () {
        var sel = $.map(arguments, function (x) {
            return ".thing.id-" + x;
        }).join(", ");
        return $(sel);
    };
    $.fn.things = function () {
        var sel = $.map(arguments, function (x) {
            return ".thing.id-" + x;
        }).join(", ");
        return this.find(sel);
    };
    $.listing = function (name) {
        name = name || "";
        var sitetable = "siteTable";
        if (name.slice(0, 1) == "#" || name.slice(0, 1) == ".") name = name.slice(1, name.length);
        var lname = name;
        if (name.slice(0, sitetable.length) != sitetable) lname = sitetable + ((name) ? ("_" + name) : "");
        else name = name.slice(sitetable.length + 1, name.length);
        var listing = $("#" + lname).filter(":first");
        if (listing.length == 0) {
            listing = $.things(name).find(".child").append(document.createElement('div')).children(":last").addClass("sitetable").attr("id", lname);
        }
        return listing;
    };
    var thing_init_func = function () {};
    $.fn.set_thing_init = function (func) {
        thing_init_func = func;
        $(this).find(".thing").each(function () {
            func(this)
        });
    };
    $.fn.new_thing_child = function (what, use_listing) {
        var id = this.thing_id();
        var where = (use_listing) ? $.listing(id) : this.thing().find(".child:first");
        var new_form;
        if (typeof(what) == "string") new_form = where.prepend(what).children(":first");
        else new_form = what.hide().prependTo(where).show().find('input[name=parent]').attr('value', id).end();
        return (new_form).randomize_ids();
    };
    $.fn.randomize_ids = function () {
        var new_id = (Math.random() + "").split('.')[1]
        $(this).find("*[id]").each(function () {
            $(this).attr('id', $(this).attr("id") + new_id);
        }).end().find("label").each(function () {
            $(this).attr('for', $(this).attr("for") + new_id);
        });
        return $(this);
    }
    $.fn.replace_things = function (things, keep_children, reveal, stubs) {
        var midcol = $(".midcol:visible:first").css("width");
        var numcol = $(".rank:visible:first").css("width");
        var self = this;
        return $.map(things, function (thing) {
            var data = thing.data;
            var existing = $(self).things(data.id);
            if (stubs) existing = existing.filter(".stub");
            if (existing.length == 0) {
                var parent = $.things(data.parent);
                if (parent.length) {
                    existing = $("<div></div>");
                    parent.find(".child:first").append(existing);
                }
            }
            existing.after($.unsafe(data.content));
            var new_thing = existing.next();
            if ($.defined(midcol)) {
                new_thing.find(".midcol").css("width", midcol).end().find(".rank").css("width", midcol);
            }
            if (keep_children) {
                new_thing.show().children(".midcol, .entry").hide().end().children(".child:first").html(existing.children(".child:first").remove().html()).end();
                if (reveal) {
                    existing.hide();
                    new_thing.children(".midcol, .entry").show();
                }
                new_thing.find(".rank:first").html(existing.find(".rank:first").html());
            }
            if (reveal) {
                existing.hide();
                if (keep_children) new_thing.children(".midcol, .entry").show();
                else new_thing.show();
                existing.remove();
            } else {
                new_thing.hide();
                existing.remove();
            }
            thing_init_func(new_thing);
            return new_thing;
        });
    };
    $.insert_things = function (things, append) {
        return $.map(things, function (thing) {
            var data = thing.data;
            var midcol = $(".midcol:visible:first").css("width");
            var numcol = $(".rank:visible:first").css("width");
            var s = $.listing(data.parent);
            if (append) s = s.append($.unsafe(data.content)).children(".thing:last");
            else s = s.prepend($.unsafe(data.content)).children(".thing:first");
            s.find(".midcol").css("width", midcol);
            s.find(".rank").css("width", midcol);
            thing_init_func(s.hide().show());
            return s;
        });
    };
    $.fn.delete_table_row = function () {
        var tr = this.parents("tr:first").get(0);
        var table = this.parents("table").get(0);
        $(tr).fadeOut(function () {
            table.deleteRow(tr.rowIndex);
        });
    };
    $.fn.insert_table_rows = function (rows, index) {
        var tables = ((this.is("table")) ? this.filter("table") : this.parents("table:first"));
        $.map(tables.get(), function (table) {
            $.map(rows, function (thing) {
                var i = index;
                if (i < 0) i = Math.max(table.rows.length + i + 1, 0);
                i = Math.min(i, table.rows.length);
                var row = table.insertRow(i);
                $(row).hide().attr("id", thing.id).addClass(thing.css_class);
                $.map(thing.cells, function (cell) {
                    $(row.insertCell(row.cells.length)).html($.unsafe(cell));
                });
                $(row).fadeIn();
            });
        });
        return this;
    };
    $.set_tracker = function (id, show_track, click_track) {
        reddit.trackers[id] = {
            show: show_track,
            click: click_track
        };
        $.things(id).filter(":visible").show();
    };
    $.fn.captcha = function (iden) {
        var c = this.find(".capimage");
        if (iden) {
            c.attr("src", "http://" + reddit.ajax_domain + "/captcha/" + iden + ".png").parents("form").find("input[name=iden]").attr("value", iden);
        }
        return c;
    };
    $.fn.insertAtCursor = function (value) {
        return $(this).filter("textarea").each(function () {
            var textbox = $(this).get(0);
            var orig_pos = textbox.scrollTop;
            if (document.selection) {
                textbox.focus();
                var sel = document.selection.createRange();
                sel.text = value;
            } else if (textbox.selectionStart) {
                var prev_start = textbox.selectionStart;
                textbox.value = textbox.value.substring(0, textbox.selectionStart) + value + textbox.value.substring(textbox.selectionEnd, textbox.value.length);
                prev_start += value.length;
                textbox.setSelectionRange(prev_start, prev_start);
            } else {
                textbox.value += value;
            }
            if (textbox.scrollHeight) {
                textbox.scrollTop = orig_pos;
            }
            $(this).focus();
        }).end();
    };
    $.fn.select_line = function (lineNo) {
        return $(this).filter("textarea").each(function () {
            var newline = '\n',
                newline_length = 1,
                caret_pos = 0;
            if ($.browser.msie) {
                newline = '\r';
                newline_length = 0;
                caret_pos = 1;
            }
            var lines = $(this).attr("value").split(newline);
            for (var x = 0; x < lineNo - 1; x++)
            caret_pos += lines[x].length + newline_length;
            var end_pos = caret_pos;
            if (lineNo <= lines.length) end_pos += lines[lineNo - 1].length + newline_length;
            $(this).focus();
            if (this.createTextRange) {
                var start = this.createTextRange();
                start.move('character', caret_pos);
                var end = this.createTextRange();
                end.move('character', end_pos);
                start.setEndPoint("StartToEnd", end);
                start.select();
            } else if (this.selectionStart) {
                this.setSelectionRange(caret_pos, end_pos);
            }
            if (this.scrollHeight) {
                var avgLineHight = this.scrollHeight / lines.length;
                this.scrollTop = (lineNo - 2) * avgLineHight;
            }
        });
    };
    $.apply_stylesheet = function (cssText) {
        var sheet_title = $("head").children("link[title], style[title]").filter(":first").attr("title") || "preferred stylesheet";
        if (document.styleSheets[0].cssText) {
            var sheets = document.styleSheets;
            for (var x = 0; x < sheets.length; x++)
            if (sheets[x].title == sheet_title) {
                sheets[x].cssText = cssText;
                break;
            }
        } else {
            $("head").children("*[title=" + sheet_title + "]").remove();
            $("head").append("<style type='text/css' media='screen' title='" + sheet_title + "'>" + cssText + "</style>");
        }
    };
    var default_cookie_domain;
    $.default_cookie_domain = function (domain) {
        if ($.defined(domain)) default_cookie_domain = domain;
        return default_cookie_domain;
    };
    var cookie_name_prefix = "_";
    $.cookie_name_prefix = function (name) {
        if ($.defined(name)) cookie_name_prefix = name + "_";
        return cookie_name_prefix;
    };
    $.cookie_test = function () {
        var m = (Math.random() + "").split('.')[1];
        var name = "test";
        $.cookie_write({
            name: name,
            data: m
        })
        if ($.cookie_read(name).data == m) {
            $.cookie_erase(name);
            return true;
        }
    };
    $.cookie_erase = function (data) {
        data.data = "";
        data.expires = -1;
        $.cookie_write(data);
    };
    $.cookie_write = function (c) {
        if (c.name) {
            var data = $.with_default(c.data, "");
            data = (typeof(data) == 'string') ? data : $.toJSON(data);
            data = cookie_name_prefix + c.name + '=' + escape(data);
            if ($.defined(c.expires)) {
                var expires = c.expires;
                if (typeof(expires) == "number") {
                    var date = new Date();
                    date.setTime(date.getTime() + (expires * 24 * 60 * 60 * 1000));
                    expires = date;
                }
                if ($.defined(expires.toGMTString)) expires = expires.toGMTString();
                data += '; expires=' + expires;
            }
            var domain = $.with_default(c.domain, default_cookie_domain);
            if ($.defined(domain)) data += '; domain=' + domain;
            data += '; path=' + $.with_default(c.path, '/');
            document.cookie = data;
        }
    };
    $.cookie_read = function (name) {
        var nameEQ = cookie_name_prefix + name + '=';
        var ca = document.cookie.split(';');
        var data = '';
        for (var i = ca.length - 1; i >= 0; i--) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) {
                data = unescape(c.substring(nameEQ.length, c.length));
                try {
                    data = $.secureEvalJSON(data);
                } catch(e) {};
                break;
            }
        }
        return {
            name: name,
            data: data
        };
    };
})(jQuery);