'use strict';

/**
 * ServiceM8 SDK Car Selecter
 * Selecs Make/Model
 */

var request = require("request");

exports.handler = (event, context, callback) => {

    /**
     * In this example, our handler function doesn't do any work itself, but instead just inspects the event name
     * and calls the correct handler to produce the desired output.
     *
     * The "car_list_start" event is fired when the user clicks the "Cal List" button that we added to the Job
     * Card via the add-on Manifest file.
     *
     * The "car_list_generate" event is fired when the user clicks the "Save" button inside the UI that we
     * have rendered. Note that the "car_list_generate" event doesn't appear anywhere in the Manifest -- we only
     * invoke this via the Client JS SDK: client.invoke("car_list_generate", params)
     *
     */
    switch(event.eventName) {
        case 'car_list_start':
            handleCarListStart(event, callback);
            break;
        case 'car_list_generate':
            handleCarListGen(event, callback);
            break;
        default:
            // Unknown event name
            callback(null, {});
    }

};

/**
 * Produce the HTML and Javascript which renders the interface for the Car List Selector
 *
 * @param event
 * @param callback
 */
function handleCarListStart (event, callback) {
    // We need to know the Job UUID in order to post a Note to the job
    var strJobUUID = event.eventArgs.jobUUID;


    /**
     * This HTML will be rendered into the popup window in an Iframe. It's divided into two parts:
     * - The "output" div is hidden by default. It contains a placeholder where we will render the Make and Model, and a "Done" button that we'll use to close the window.
     * - The "input" div contains input elements that allow the user to enter the required data. We also include a
     *   hidden input to record the Job UUID as we'll need to provide it when we invoke the "car_list_generate" event
     */
    var strHTML = ''
        + '<div id="loading" class="loading"></div>'
        + '<div id="input" style="display:none;">'
        + '<input type="hidden" id="job_uuid" name="job_uuid" value="' + strJobUUID + '" />'
        + '<label for="current_ph">Make</label><select id="makes_select"></select><br />'
        + '<label for="desired_ph">Model</label><select id="models_select"></select><br />'
        + '<button id="button_save">Save</button><br />'
        + '<p id="saving" style="display:none;">Saving...</p>'
        + '</div>';

    /**
     * This Javascript code is sent to the client and executed by the browser inside the iframe. It is **NOT** executed
     * by the Lambda function.
     *
     * We've included JQuery in this example to simplify the process of manipulating the DOM elements (see the wrapResponse
     * function below)
     */
    var strJS = `
        /**
         * Initialise the client-side SDK as we will need to use it to invoke the car_list_generate event
         */
        var client = SMClient.init();

        /*
         * When the DOM is ready, we use JQuery to attach click handlers to the "Save" button and
         * the "Done" button
         */
        $().ready(function() {

            let cars=[];

            $.getJSON( "http://www.touchupguys.com.au/cars.json", function( data ) {
                cars = data;
                let makes =[];
                cars.forEach(function(car){
                 if(makes.indexOf(car.Make)==-1){
                    makes.push(car.Make);
                    $("#makes_select").append("<option value='" +car.Make+ "'>" +car.Make+ "</option>");
                 }
                });
                getModels( "Abarth" );
                $("#loading").hide();
                $("#input").show();
            });

            function getModels(make) {
                $("#models_select").empty();
                let models =[] ;
                cars.forEach(function(car){
                    if(car.Make==make){
                        models.push(car.Model);
                        $("#models_select").append("<option value='" +car.Model+ "'>" +car.Model+ "</option>");
                    }
                });
            return models ;
            }

            $('#makes_select').on('change', function() {
                getModels( this.value );
            });

            $("#button_save").click(function() {
                $("#saving").show();
                client.invoke("car_list_generate", {
                    job_uuid: $("#job_uuid").val(),
                    make: $("#makes_select").val(),
                    model: $("#models_select").val(),
                }).then(function(result) {
                    client.closeWindow();
                });
            });

        });`;

    /**
     * Once we have our HTML and Javascript, we wrap them in our boilerplate code which includes <html>, <body> tags,
     * javascript and CSS includes etc. You could include that all in the single function, but we've broken it out
     * for clarity.
     */
    callback(null, {eventResponse: wrapResponse(strHTML, strJS)});
}

/**
 * This event is invoked when the user clicks the "Save" button inside our Car List popup.
 *
 *
 * @param event
 * @param callback
 */
function handleCarListGen(event, callback) {

    /**
     * Event arguments specified in the second argument of client.invoke() are available in the
     * event.eventArgs object.
     */
    var Make = event.eventArgs.make,
        Model = event.eventArgs.model,
        strJobUUID = event.eventArgs.job_uuid;


    // Produce a note of Make and Model
    let strNote = "Make: " + Make + "  "
                + "Model: " + Model;

    // Now post a Note to the Notes endpoint
    request.post({
        url: 'https://api.servicem8.com/api_1.0/Note.json',
        auth: {
            bearer: event.auth.accessToken // We can use the temporary access token issued to us for authentication
        },
        form: {
            related_object: 'job',
            related_object_uuid: strJobUUID, // This is why we needed to persist the job_uuid through the Car List form
            note: strNote
        }
    }, (err, httpResponse, body) => {

        // Check whether the request succeeded
        let boolNotePosted = (httpResponse.statusCode == 200),
          strNotePosted = boolNotePosted ? '<p>Note has been posted to the Job Diary</p>' : '<p>Unable to post Note to Job Diary: <pre>' + body + '</pre></p>';

        // Now we can return from the Lambda function by calling the "callback" function
        callback(null, {eventResponse: '<h1>' + strNote + '</h1>' + strNotePosted});

        });

}


/**
 * Add static HTML and Javascript. This is where we include the base CSS and Javascript
 * as well as our custom styles. We also include JQuery in this example so we can get values
 * from input elements and easily attach click handlers to our buttons.
 *
 * @param strHTML
 * @returns {string}
 */
function wrapResponse(strHTML, strJavascript) {
    return `
<html>
	<head>
		<link rel="stylesheet" href="https://platform.servicem8.com/sdk/1.0/sdk.css">
    	<script src="https://platform.servicem8.com/sdk/1.0/sdk.js"></script>
    	<script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
    	<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/css-spinning-spinners/1.1.1/load4.css" />
		<script>
			` + strJavascript + `
		</script>
		<style>
            body {
                padding: 1em;
            }
        </style>
    </head>
    <body>
		` + strHTML + `
	</body>
</html>
`;
}
