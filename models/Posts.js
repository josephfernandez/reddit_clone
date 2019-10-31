var mongoose = require('mongoose');

var PostSchema = new mongoose.Schema({
  title: String,
  body: String,
  author: String,
  link: String,
  upvotes: {type: Number, default: 0},
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  votes: [{type: mongoose.Schema.Types.String, unique : true}]
});

PostSchema.methods.upvote = function(cb) {
  this.upvotes += 1;
  this.save(cb);
};

PostSchema.methods.downvote = function(cb) {
  this.upvotes -= 1;
  this.save(cb);
};



mongoose.model('Post',PostSchema);
