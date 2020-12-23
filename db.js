const mongoose = require('mongoose')
Schema = mongoose.Schema

const userSchema = new Schema({
    user_id: {type: String, default: '', trim: true},
    password: {type: String, default: '', trim: true}
});

const restaurantSchema = new Schema({
    name: {type: String, default: '', trim: true},
    borough: {type: String, default: '', trim: true},
    cuisine: {type: String, default: '', trim: true},
    photo: {type: String, default: '', trim: true},
    photo_mimetype: {type: String, default: '', trim: true},
    street: {type: String, default: '', trim: true},
    building: {type: String, default: '', trim: true},
    zipcode: {type: String, default: '', trim: true},
    coord_lon: {type: String, default: '', trim: true},
    coord_lat: {type: String, default: '', trim: true},
    grades: [{
        user: {type: String, default: '', trim: true},
        score: {type: Number, default: 0}
    }],
    owner: {type: String, default: '', trim: true},
})
restaurantSchema.virtual('restaurant_id').get(function() { return this._id; });

module.exports = { userSchema, restaurantSchema }





