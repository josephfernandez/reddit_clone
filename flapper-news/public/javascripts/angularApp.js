
angular.module('flapperNews', ['ui.router'])
.config([
'$stateProvider',
'$urlRouterProvider',
function($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('home', {
      url: '/home',
      templateUrl: '/home.html',
      controller: 'MainCtrl',
      resolve: {
        postPromise: ['posts', function(posts){
          return posts.getAll();
        }]
      }
    })
    .state('posts', {
      url: '/posts/{id}',
      templateUrl: '/posts.html',
      controller: 'PostsCtrl',
      resolve: {
        post: ['$stateParams', 'posts', function($stateParams, posts) {
          return posts.get($stateParams.id);
        }]
      }
    })
    .state('login', {
      url: '/login',
      templateUrl: '/login.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'auth', function($state, auth){
        if(auth.isLoggedIn()){
          $state.go('home');
        }
      }]
    })
    .state('register', {
      url: '/register',
      templateUrl: '/register.html',
      controller: 'AuthCtrl',
      onEnter: ['$state', 'auth', function($state, auth){
        if(auth.isLoggedIn()){
          $state.go('home');
        }
      }]
    });

  $urlRouterProvider.otherwise('home');
}])
.factory('posts', ['$http', 'auth', function($http, auth){
  var o = {
    posts: []
  };

  o.get = function(id) {
    return $http.get('/posts/' + id).then(function(res){
      return res.data;
    });
  };

  o.getAll = function() {
    return $http.get('/posts').success(function(data){
      angular.copy(data, o.posts);
    });
  };

  o.create = function(post) {
    return $http.post('/posts', post, {
      headers: {Authorization: 'Bearer '+auth.getToken()}
    }).success(function(data){
      o.posts.push(data);
    });
  };

  o.upvote = function(post) {
    return $http.put('/posts/' + post._id + '/upvote', null, {
      headers: {Authorization: 'Bearer '+auth.getToken()}
    }).success(function(data){
      post.upvotes += 1;
      post.votes = data.votes
    });
  };

  o.downvote = function(post) {
  return $http.put('/posts/' + post._id + '/downvote', null, {
    headers: {Authorization: 'Bearer ' +auth.getToken()}
  }).success(function(data){
    post.upvotes -= 1;
    post.votes = data.votes;
  });
};

  o.addComment = function(id, comment) {
    return $http.post('/posts/' + id + '/comments', comment, {
      headers: {Authorization: 'Bearer '+auth.getToken()}
    });
  };

  o.upvoteComment = function(post, comment) {
    return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/upvote', null, {
      headers: {Authorization: 'Bearer '+ auth.getToken()}
    }).success(function(data){
      comment.upvotes += 1;
      comment.votes = data.votes;
    });
  };

  o.downvoteComment = function(post, comment) {
    return $http.put('/posts/' + post._id + '/comments/'+ comment._id + '/downvote', null, {
      headers: {Authorization: 'Bearer ' + auth.getToken()}
    }).success(function(data){
      comment.upvotes -= 1;
      comment.votes = data.votes;
    })
  }

  return o;
}])
.factory('auth', ['$http', '$window', '$rootScope', function($http, $window, $rootScope){
   var auth = {
    saveToken: function(token){
      $window.localStorage['flapper-news-token'] = token;
    },
    getToken: function(){
      return $window.localStorage['flapper-news-token'];
    },
    isLoggedIn: function(){
      var token = auth.getToken();

      if(token){
        var payload = JSON.parse($window.atob(token.split('.')[1]));

        return payload.exp > Date.now() / 1000;
      } else {
        return false;
      }
    },
    currentUser: function(){
      if(auth.isLoggedIn()){
        var token = auth.getToken();
        var payload = JSON.parse($window.atob(token.split('.')[1]));

        return payload.username;
      }
    },
    register: function(user){
      return $http.post('/register', user).success(function(data){
        auth.saveToken(data.token);
      });
    },
    logIn: function(user){
      return $http.post('/login', user).success(function(data){
        auth.saveToken(data.token);
      });
    },
    logOut: function(){
      $window.localStorage.removeItem('flapper-news-token');

    }
  };

  return auth;
}])
.controller('MainCtrl', [
'$scope',
'posts',
'auth',
function($scope, posts, auth) {
  $scope.posts = posts.posts;
  $scope.isLoggedIn = auth.isLoggedIn;
  $scope.addPost = function(){
    if($scope.title === '' || $scope.body === '' || $scope.link === '') { return; }
    posts.create({
      title: $scope.title,
      body: $scope.body,
      author: auth.currentUser(),
      link: $scope.link,
    });
    $scope.title = '';
    $scope.body = '';
    $scope.link = '';
  };

  $scope.incrementUpvotes = function(post) {
    posts.upvote(post);
  };

  $scope.decrementUpvotes = function(post) {
    posts.downvote(post);
  };
}])

.controller('PostsCtrl', [
'$scope',
'posts',
'post',
'auth',
function($scope, posts, post, auth){
  $scope.currentUser = auth.currentUser;
  $scope.post = post;
  $scope.isLoggedIn = auth.isLoggedIn;

  $scope.addComment = function(){
    if($scope.body === '') { return; }
    posts.addComment(post._id, {
      body: $scope.body,
      author: 'user',
    }).success(function(comment) {
      $scope.post.comments.push(comment);
    });
    $scope.body = '';
  };

  $scope.incrementUpvotes = function(comment){
    posts.upvoteComment(post, comment);
  };
  $scope.decrementUpvotes = function(comment) {
    posts.downvoteComment(post, comment);
  };

}])
.controller('AuthCtrl', [
'$scope',
'$state',
'posts',
'auth',
function($scope, $state, posts, auth){
  $scope.user = {};
  console.log('hello');
  var posts = posts.getAll();

  $scope.register = function(){

    auth.register($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };

  $scope.logIn = function(){
    auth.logIn($scope.user).error(function(error){
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    });
  };
}])
.controller('NavCtrl', [
'$scope',
'auth',
function($scope, auth){
  $scope.isLoggedIn = auth.isLoggedIn;
  $scope.currentUser = auth.currentUser;
  $scope.logOut = auth.logOut;
}]);

$(document).ready(function() {
  // $(document).on("click",".register-button",function() {
  //   alert("hell0")
  // })
  $(document).on("mouseleave","#form-input",function() {
    if($('#form-input-field').not(':focus')) {
      $('#form-input').css('background-color','#f3f3f3');
      $('#form-input-field').css('background-color','#f3f3f3');
      $('#form-input').css('border','1px solid transparent');
    }
    if($('#form-input-field').is(':focus')){
      $('#form-input').css('background-color','white');
      $('#form-input-field').css('background-color','white');
      $('#form-input').css('border','1px solid #0079D3');
    }
  });
  $(document).on("focusout","#form-input-field",function() {
    $(this).css('background-color','#f3f3f3');
    $(this).parent('form').parent('div').css('background-color','f3f3f3');
    $(this).parent('form').parent('div').css('border','1px solid transparent');
  });
  $(document).on("mouseenter","#form-input-field",function(){
    $(this).css('background-color','white');
    $(this).parent('form').parent('div').css('background-color','white');
    $(this).parent('form').parent('div').css('border','1px solid #0079D3');
  });
  $(document).on("mouseenter","#form-input",function(){
    $(this).css('background-color','white');
    $('#form-input-field').css('background-color','white');
    $(this).css('border','1px solid #0079D3');
  });
  // $(document).on("mouseleave","#search-icon",function(){
  //   if($('#form-input-field').not(':focus')) {
  //     $('#form-input').css('background-color','#f3f3f3');
  //     $('#form-input-field').css('background-color','#f3f3f3');
  //     $('#form-input').css('border','1px solid transparent');
  //   }
  //   if($('#form-input-field').is(':focus')){
  //     $('#form-input').css('background-color','white');
  //     $('#form-input-field').css('background-color','white');
  //     $('#form-input').css('border','1px solid #0079D3');
  //   }
  // });
  $('#form-input').hover(function() {
    $('#form-input').css('background-color','white');
    $('#form-input-field').css('background-color','white');
    $('#form-input').css('border','1px solid #0079D3');
  });
  $(document).on("click",'#form-input',function(){
    $('#form-input-field').focus();
  })
  $(document).on("mouseenter","#search-icon",function(){
    $('#form-input').css('background-color','white');
    $('#form-input-field').css('background-color','white');
    $('#form-input').css('border','1px solid #0079D3');
  });
});


// document.getElementById("form-input").addEventListener("search", function(event) {
//   $("#form-input").empty();
// });
// //
// $("#searchclear").click(function(){
//     $("#searchinput").val('');
// });
