import { Meteor } from 'meteor/meteor';

if (Meteor.isServer) {
    Meteor.publish('userData', function() {
        return Meteor.users.find({_id: this.userId}, { fields: {'follows': 1, 'live': 1} });
    });
}

Meteor.methods({

    'channelsFollowed.refresh'() {
        var user = Meteor.users.findOne(this.userId);
        var uID = this.userId;
        var result = HTTP.get('https://api.twitch.tv/kraken/users/'+user.services.twitch.name+'/follows/channels', {
            headers: {
                'Accept': 'application/vnd.twitchtv.v3+json'
            },
            data: {
                limit: 100
            }
        });

        result = JSON.parse(result.content).follows;
        var channels = [];
        result.forEach(function(stream) {
            channels.push(stream.channel);
        });

        if (typeof user.follows !== 'undefined') {
            // Insert and update new entries
            channels.forEach(function(stream) {
                var find = Meteor.users.findOne({_id: uID, 'follows.name': stream.name});
                if (typeof find === 'undefined') {
                    // Not found, insert
                    Meteor.users.update(uID, {$push: {follows: stream}});
                } else {
                    // Update
                    Meteor.users.update({
                        _id: uID,
                        'follows.name': stream.name
                    }, {$set: {'follows.$': stream}});
                }
            });

            // Check if anything unfollowed
            Meteor.users.findOne(this.userId).follows.forEach(function(stream) {
                var found = true;
                for (var i=0; i < channels.length; i++) {
                    if (channels[i].name == stream.name) {
                        found = false;
                        break;
                    }
                }
                if (found) {
                    Meteor.users.update(uID, { $pull: { follows: stream } });
                }
            });
        } else {
            // Undefined
            Meteor.users.update(this.userId, { $set: { follows: channels } });
        }
    },

    'channelsFollowed.update'(pos1, pos2) {
        // Get follower array
        var arrFollow = Meteor.users.findOne(this.userId).follows;
        if (typeof arrFollow !== 'undefined') {
            // Move position
            arrFollow.splice(pos2, 0, arrFollow.splice(pos1, 1)[0]);

            // Push array
            Meteor.users.update(this.userId, { $set: { follows: arrFollow } });
        }
    },

    'channelsLive.refresh'() {
        // Get live follows
        var user = Meteor.users.findOne(this.userId);
        var result = HTTP.get('https://api.twitch.tv/kraken/streams/followed', {
            headers: {
                'Accept': 'application/vnd.twitchtv.v3+json',
                'Authorization': 'OAuth ' + user.services.twitch.accessToken
            },
            data: {
                limit: 100,
                stream_type: 'live'
            }
        });
        result = JSON.parse(result.content).streams;

        var channels = [];
        result.forEach(function(stream) {
            channels.push(stream.channel);
        });

        Meteor.users.update(this.userId, { $set: { live: channels } });
    }

});

