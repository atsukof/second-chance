function searchQuery() {
    keywords = $("#search-input").val().split(" ")
    sessionStorage.setItem('keywords', keywords);
}

function setup() {

    console.log('selected:', sessionStorage.getItem('type'))

    if (sessionStorage.getItem('keywords')) {
        var keywords = sessionStorage.getItem('keywords').split(',');
    } else if (sessionStorage.getItem('advanced_queries')) {
        var advanced_queries = JSON.parse(sessionStorage.getItem('advanced_queries'))
    } else if (sessionStorage.getItem('type')) {
        var selectedType = sessionStorage.getItem('type');
        if (selectedType == 'type-furniture') {
            var type = "Furniture"
        }
        if (selectedType == 'type-household-items') {
            var type = "Household Items"
        }
        if (selectedType == 'type-electronics') {
            var type = "Electronics"
        }
        if (selectedType == 'type-plants') {
            var type = "Plants"
        }
    }

    // search with enter key
    $("#search-input").keydown((e) =>{
        var keyCode = e.which || e.keyCode;
        if(keyCode == 13) {
            searchQuery()
            window.location.href = `search.html`
        }
    })

    sessionStorage.clear();
    query = db.collection("items").where('status', '==', 'active')


    if (keywords) {
        query = query.where('name', 'in', keywords)
    }

    if (advanced_queries) {
        for (let key in advanced_queries) {
            
            if (key === 'name') {
                query = query.where('name', 'in', advanced_queries[key].split(' '))
            } else if (key === 'price-range') {
                if (advanced_queries[key] === '50') {
                    query = query.where('price', '<=', parseInt(advanced_queries[key]))
                    query.get()
                    .then(
                        results => {
                            results.forEach(result => {
                                var result_obj = {
                                    name: result.data().name,
                                    image: result.data().image,
                                    price: result.data().price,
                                    location: result.data().location,
                                    id: result.id
                                };
                                console.log("results_ind:", result_obj)
                            })
                        }
                    )
                } else if (advanced_queries[key] === '100') {
                    // console.log('here 100')
                    // display results that are within price range of [50, 100]
                    query = query.where('price', '<=', parseInt(advanced_queries[key]))
                    query = query.where('price', '>=', 50)
                } else if (advanced_queries[key] === '500') {
                    // console.log('here 500')
                }
            } else {
                query = query.where(key, '==', advanced_queries[key])
            }
        }
    } else if (type) {
        query = query.where('type', '==', type);
    }

    // console.log(query)

    results_arr = []
    query.get()
        .then(
            results => {
                results.forEach(result => {
                    var result_obj = {
                        name: result.data().name,
                        image: result.data().image,
                        price: result.data().price,
                        location: result.data().location,
                        id: result.id
                    };
                    results_arr.push(result_obj);
                })
            }
        )
        .then(() => {
            console.log(results_arr.length);
            if (results_arr.length == 0) {
                document.getElementById('results').innerHTML += 'No listings found.'
            } else {
                for (let i = 0; i < results_arr.length; i++) {
                    let redirect = document.createElement('a')
                    redirect.href = `listing.html?docID=${results_arr[i].id}`
                    let search = document.createElement('div')
                    search.className = 'search'
                    let image = document.createElement('img')
                    image.src = results_arr[i].image
                    let price = document.createElement('p')
                    price.className = 'price'
                    price.innerHTML = `$${results_arr[i].price}`
                    let location = document.createElement('p')
                    location.innerHTML = results_arr[i].location
                    location.className = 'location'
    
                    redirect.appendChild(image)
                    search.appendChild(redirect)
                    search.appendChild(price)
                    search.appendChild(location)
                    document.getElementById('results').appendChild(search)
                }
            }

        });
}

$(document).ready(setup);