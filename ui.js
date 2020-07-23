$(async function() { //Why is this structured this way?
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedArticles = $('#favorited-articles');
  const $userProfile = $('#user-profile');
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();
  console.log(currentUser)

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    try {
    const userInstance = await User.login(username, password);
  
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    } catch (error) {
      console.log(error)
      alert('Incrorect Username or Password')
    }
    
    
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    try {
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    } catch (error) {
      console.log(error)
      alert('Username taken')
    }
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  $submitForm.on('submit', async function(evt){
    evt.preventDefault();
    
    const story = {
      author: $('#author').val(),
      url: $('#url').val(),
      title: $('#title').val()
    }
    
    const newStory = await StoryList.addStory(currentUser, story);
    $allStoriesList.prepend(generateStoryHTML(newStory));
    $allStoriesList.show();
    $submitForm.hide();
  })

  $('#nav-favorites').on('click', function(){
    hideElements();
    $favoritedArticles.empty();    

    if (currentUser.favorites.length > 0) {
      const favorites = currentUser.favorites;
      for (let favorite of favorites) {
        const result = generateStoryHTML(favorite);
        $favoritedArticles.prepend(result);
      }
    }

    else {
      $('<h5>No favorites added yet!</h5>').appendTo($favoritedArticles);
    }
    $favoritedArticles.show();
  })

  $('#nav-ownstories').on('click', function(){
    hideElements();
    $ownStories.empty();    

    if (currentUser.ownStories.length > 0) {
      const ownStories = currentUser.ownStories;
      for (let story of ownStories) {
        const result = generateStoryHTML(story, true);
        $ownStories.prepend(result);
      }
    }

    else {
      $('<h5>No stories added yet!</h5>').appendTo($ownStories);
    }
    $ownStories.show();
  })

  $('#nav-submit').on('click', function(){
    hideElements();
    $submitForm.show();
  })

  $('body').on('click', '.fa-heart', async function (evt) {
    const storyId = $(evt.target).parent().parent()[0].id;
    const tgt = $(evt.target)
    
    if (tgt.hasClass('far')) {
      await User.addFavorite(currentUser, storyId);
      tgt.closest("i").toggleClass("fas far");
    }
    else {
      await User.removeFavorite(currentUser, storyId);
      tgt.closest("i").toggleClass("fas far");
    }
  })

  $('body').on('click', '.fa-trash-alt', async function (evt) {
    const storyId = $(evt.target).parent().parent()[0].id;
    const tgt = $(evt.target)

    const result = await StoryList.removeStory(currentUser, storyId);
    tgt.parent().parent().remove()

  })


  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();
    
    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      $allStoriesList.append(generateStoryHTML(story));
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);
    let heartType;
    if (checkFavoriteStatus(story.storyId)) {
      heartType = 'fas';
    }
    else {
      heartType = 'far';
    };

    const trashIcon = isOwnStory 
    ? '<span class="trash-can"><i class="fas fa-trash-alt"></i></span>' : ''

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <span class="heart">
        <i class="${heartType} fa-heart" aria-hidden="true"></i>
        </span>
        ${trashIcon}
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  function checkFavoriteStatus(storyId) {
    if (currentUser) {
    const ids = currentUser.favorites.map(function(obj) {
      return obj.storyId;
    });
    return ids.includes(storyId);
  }
}

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $favoritedArticles,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $('#nav-favorites').show();
    $('#nav-submit').show();
    $('#nav-ownstories').show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
