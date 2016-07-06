import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import './main.html';

Template.body.onCreated(function bodyOnCreated() {
    if (Meteor.user()) {
        Meteor.call('channelsFollowed.refresh');
        Meteor.call('channelsLive.refresh');

        // Cron
        setInterval(function(){
            Meteor.call('channelsLive.refresh');
        }, 1000*60*2);
        setInterval(function(){
            Meteor.call('channelsFollowed.refresh');
        }, 1000*60*10);
    }

    Session.set('playerRendered', false);
    Meteor.subscribe('userData');
});

Template.twitchPlayer.rendered = function() {
    var w = $('#view').width();
    var options = {
        width: w,
        height: w*9/16,
        channel: "atlatonin"
    };
    twitchPlayer = new Twitch.Player("twitchPlayer", options);
    Session.set('playerRendered', true);
};

Template.channels.helpers({
    channels() {
        if (Session.get('playerRendered')) {
            var prio = getHighestPriority(Meteor.user().follows, Meteor.user().live);
            if (twitchPlayer.getChannel() != prio.name) {
                twitchPlayer.setChannel(prio.name);
                //TODO: REMOVE
                twitchPlayer.pause();
            }
        }
        return Meteor.user().follows;
    }
});

Template.body.helpers({
    loggedOn() {
        if (Meteor.user()) {
            return 'channels_cur';
        } else {
            return 'channels';
        }
    }
});

Template.channels.rendered = function() {
    var fixHelperModified = function(e, tr) {
        var $originals = tr.children();
        var $helper = tr.clone();
        $helper.children().each(function(index)
        {
            $(this).width($originals.eq(index).width())
        });
        return $helper;
    };

    this.$('#list tbody').sortable({
        helper: fixHelperModified,
        start: function(e, ui) {
            Session.set('q', ui.item.index());
        },
        stop: function(e, ui) {
            Meteor.call('channelsFollowed.update', Session.get('q'), ui.item.index());
        }
    }).disableSelection();
};

function getHighestPriority(channels, streams) {;
    for (i=0; i<channels.length; i++) {
        for (j=0; j<streams.length; j++) {
            if (channels[i].name == streams[j].name) {
                return channels[i];
            }
        }
    }
}

Template.login.events({
    'click #login': function(event) {
        Meteor.loginWithTwitch({}, function(err){
            if (err) {
                throw new Meteor.Error("Twitch login failed");
            }
        });
    },

    'click #logout': function(event) {
        Meteor.logout(function(err){
            if (err) {
                throw new Meteor.Error("Logout failed");
            }
        })
    }
});