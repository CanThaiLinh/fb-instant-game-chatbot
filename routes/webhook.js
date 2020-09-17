const { MongoClient, ObjectID } = require('mongodb');
const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.BOT_VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        console.warn('Failed validation. Make sure the tokens match.');
        res.sendStatus(403);
    }
});

router.post('/', (req, res) => {
    let data = req.body;
    // Make sure this is a page subscription
    if (data.object === 'page') {
        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function (entry) {
            // Here you can obtain values about the webhook, such as:
            // var pageID = entry.id
            // var timeOfEvent = entry.time
            entry.messaging.forEach(function (event) {
                if (event.message) {
                    receivedMessage(event);
                } else if (event.game_play) {
                    receivedGameplay(event);
                } else {
                    console.log('Webhook received unknown event: ', event);
                }
            });
        });
    }
    res.sendStatus(200);
})

//
// Handle messages sent by player directly to the game bot here
//
function receivedMessage(event) {

}

//
// Handle game_play (when player closes game) events here.
//
async function receivedGameplay(event) {
    // Page-scoped ID of the bot user
    var senderId = event.sender.id;

    // FBInstant player ID:  event.game_play.player_id
    // FBInstant context ID: event.game_play.context_id
    // User's Page-scoped ID: event.sender.id

    // Check for payload
    if (event.game_play.payload) {
        //
        // The variable payload here contains data set by
        // FBInstant.setSessionData()
        //
        // var payload = JSON.parse(event.game_play.payload);

        const client = new MongoClient(process.env.MONGO_URI, { useUnifiedTopology: true });
        await client.connect();
        const database = client.db('tlmn');
        const collection = database.collection('players');
        await collection.updateOne(
            { _id: event.game_play.player_id },
            { $set: { psid: senderId, updated_at: new Date() } },
            { upsert: true }
        );
    }
}

module.exports = router;