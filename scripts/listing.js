var user_ID
var item_ID = null
var seller_ID
var currentUser


//------------------------------------------------
// Call this function when the "logout" button is clicked
//-------------------------------------------------
function logout() {
    firebase.auth().signOut().then(() => {
        // Sign-out successful.
        console.log("logging out user");
    }).catch((error) => {
        // An error happened.
    });
}

//------------------------------------------------------------------------------
// Input parameter is a string representing the collection we are reading from
//------------------------------------------------------------------------------


async function itemInfo() {
    // parse URL to get item ID, and then get item details
    // append item details on the listing page
    let params = new URL(window.location.href); //get URL of search bar
    item_ID = params.searchParams.get("docID"); //get value for key "id"
    console.log(item_ID, "item_ID");

    await db.collection("items")
        .doc(item_ID)
        .get()
        .then(async (doc) => {
            let imgEvent = document.querySelector(".item-img");
            imgEvent.src = `${doc.data().image}`;
            $(".item-name-text").append(doc.data().name);
            document.querySelector("i").id = "save-" + item_ID

            // check if the item is in the watchlist
            currentUser.get().then(userDoc => {
                //get the user name
                var watchlist_items = userDoc.data().watchlists;
                if (watchlist_items.includes(item_ID)) {
                    document.getElementById('save-' + item_ID).innerText = 'favorite';
                }
            })
            if (doc.data().status === "sold") {
                document.querySelector('i').style.display = 'none';
            }
            document.querySelector('i').onclick = () => updateWatchlist(item_ID);

            // get users collection -> user.name
            seller_ID = doc.data().seller_ID;
            localStorage.setItem("seller_ID", seller_ID);

            let seller_docRef = await db.collection("users").doc(seller_ID).get();
            seller_rating = seller_docRef.data().rating;
            seller_rating = Math.round(seller_rating);


            // convert rating to stars
            stars = ""
            let rating_stars = "";
            for (let i = 0; i < seller_rating; i++) {
                rating_stars += '<span class="material-icons" style="font-size:15px">star</span>';
            }

            for (let i = seller_rating; i < 5; i++) {
                rating_stars += '<span class="material-icons" style="font-size:15px">star_outline</span>';
            }


            db.collection("users").doc(seller_ID).get()
                .then(
                    seller => {
                        seller = seller.data()
                        $(".seller-name").append(`
                        <a href="profile.html?userID=${seller_ID}" class="seller-name-link">${seller.name}</a> 
                        ${rating_stars}
                        `)
                    })
            
            // show item details
            $("#price").text(`$${doc.data().price}`);
            let details_location = doc.data().location === undefined ? " " : doc.data().location;
            let details_color = doc.data().color === undefined ? " " : doc.data().color;
            let details_material = doc.data().material === undefined ? " " : doc.data().material;
            let options = { year: 'numeric', month: '2-digit', day: '2-digit' };
            let details_posted = doc.data().date_created === undefined ? " " : doc.data().date_created.toDate().toLocaleString('en-US', options);
            let description = doc.data().description === undefined ? " " : doc.data().description;
            
            if (details_color === " ") {
                document.getElementById("color-row").style.display = "none";
                console.log("color is empty")
            }
            if (details_material === " ") {
                document.getElementById("material-row").style.display = "none";
            }
            if (details_location === " ") {
                document.getElementById("location-row").style.display = "none";
            }
            if (details_posted === " ") {
                document.getElementById("date-row").style.display = "none";
            }
            document.getElementById("location").innerHTML = details_location;
            document.getElementById("color").innerHTML = details_color;
            document.getElementById("material").innerHTML = details_material;
            document.getElementById("posted").innerHTML = details_posted;

            document.getElementById("description").innerHTML = description;
        });
    return item_ID;
}

async function showEdit(item_ID) {
    // show edit button for the active item
    let doc = await db.collection("items").doc(item_ID).get();
    is_sold = doc.data().status
    if (is_sold != 'sold') {
        firebase.auth().onAuthStateChanged(async function (user) {
            if (user && seller_ID === user.uid) {
                document.getElementById('edit-btn').style.display = 'block'
            } else if (user && seller_ID != user.uid) {
                document.getElementById('buy-btn').style.display = 'block'
            }
        })
    }
}

function saveItemID() {
    // save item id to local storage
    let params = new URL(window.location.href) //get the url from the search bar
    let ID = params.searchParams.get("docID");
    localStorage.setItem('item_ID', ID);
}

async function getUserID() {
    // get the id of user who login
    firebase.auth().onAuthStateChanged(async function (user) {
        if (user) {
            localStorage.setItem('user_ID', user.uid)
            var user_ID = user.uid;
            currentUser = await db.collection("users").doc(user_ID);
            console.log(`currentUser: ${user_ID}`)
            return user_ID;
        }
    })
}

function updateWatchlist(item_ID) {
    // click favorite icon to add this item to watchlist
    // click favorite icon again to remove it from watchlist
    currentUser.get().then(userDoc => {
        let watchlist_items = userDoc.data().watchlists
        let iconID = 'save-' + item_ID;
        let isInWatchlist = watchlist_items.includes(item_ID);

        if (isInWatchlist) {
            currentUser.update({
                watchlists: firebase.firestore.FieldValue.arrayRemove(item_ID)
            }).then(() => {
                console.log(`item ${item_ID} was removed.`)
                document.getElementById(iconID).innerText = 'favorite_border';
            })

        } else {
            currentUser.update({
                watchlists: firebase.firestore.FieldValue.arrayUnion(item_ID)
            })
                // Handle the front-end update to change the icon
                .then(function () {
                    console.log(`item ${item_ID} was added to your watchlist.`);
                    document.getElementById(iconID).innerText = 'favorite';
                });
        }
    })

}


async function displayCommentsDynamically(item_ID) {
    // Get comment from firestore and append on the listing page
    const all_comments = await db.collection("comments").where("item_ID", "==", item_ID).orderBy(`comment_date`, `desc`).get()
    const comments = all_comments.docs;
    comments.forEach(async (doc) => {
        var commenter = await doc.data().comment_user_ID;
        var commenter_docRef = await db.collection("users").doc(commenter).get()
        var commenter_name = commenter_docRef.data().name;
        var commentDate = doc.data().comment_date;
        var commentText = doc.data().comment_text;

        let newcard = commentTemplate.content.cloneNode(true); // Clone the HTML template to create a new card (newcard) that will be filled with Firestore data.

        //update comment name, date, text
        newcard.querySelector('.commenter-name').innerHTML = commenter_name;
        newcard.querySelector('.comment-date').innerHTML = commentDate.toDate().toLocaleString();
        newcard.querySelector('.comment-text').innerHTML = commentText;

        document.getElementById("comments-go-here").appendChild(newcard);
    })
};


function checkCommentFields() {
    // check comment box is empty or not
    // comment button only work when comment box is not empty
    var comment = document.getElementById("comment").value;

    if (comment != '') {
        $("#comment-btn").removeClass("disabled");
    }
    else {
        $("#comment-btn").addClass("disabled");
    }
}

async function postComment() {
    // Get comment value from comment box
    // Create a new comment to firestore
    user_ID = localStorage.getItem("user_ID")
    var commentDate = firebase.firestore.Timestamp.fromDate(new Date())
    var commentText = document.getElementById("comment").value

    var user = firebase.auth().currentUser;

    if (user) {
        db.collection("comments").add({
            comment_date: commentDate,
            comment_text: commentText,
            comment_user_ID: user_ID,
            item_ID: item_ID
        }).then(() => {
            alert("Comment submitted.");
            window.location.href = `listing.html?docID=${item_ID}`; // Redirect to the listing page
        });
    } else {
        console.log("No user is signed in");
    }
};
async function setup() {
    // when document is ready, get item details and comment
    // append those on the listing page
    await getUserID();
    item_ID = await itemInfo();
    saveItemID();

    displayCommentsDynamically(item_ID);
    $("#comment").keyup(checkCommentFields);
    showEdit(item_ID);
}

$(document).ready(setup)