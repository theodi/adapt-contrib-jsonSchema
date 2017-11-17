define(function(require) {
    var QuestionView = require('coreViews/questionView');
    var Adapt = require('coreJS/adapt');
    var ace = require('libraries/ace');
    var Ajv = require('components/adapt-contrib-jsonSchema/js/ajv.min.js');
    var genericAnswerIndexOffset = 65536;

    var JsonSchema = QuestionView.extend({
        events: {
            "focus input":"clearValidationError"
        },

        resetQuestionOnRevisit: function() {
            this.setAllItemsEnabled(false);
            this.resetQuestion();
        },

        setupQuestion: function() {
            this.model.set( '_genericAnswerIndexOffset', genericAnswerIndexOffset );
            this.restoreUserAnswer();
        },

        restoreUserAnswer: function() {
            if (!this.model.get("_isSubmitted")) return;

            var userAnswer = this.model.get("_userAnswer");

            this.setQuestionAsSubmitted();
            this.markQuestion();
            this.setScore();
            this.showMarking();
            this.setupFeedback();
        },

        showFeedback: function() {
            feedback = "";
            if (this.model.get('_isCorrect')) {
                feedback = "<h3>" + this.model.get("feedbackMessage") + "</h3>";
            } else {
                feedback = "<h3>" + this.model.get("feedbackTitle") + "</h3>";
                feedback += "<p>" + this.model.get("feedbackMessage") + "</p>";
            }
            this.$('#feedback').html(feedback);
            this.$('#feedback').show();
        },
        
        disableQuestion: function() {
            //this.setAllItemsEnabled(false);
        },

        enableQuestion: function() {
           //this.setAllItemsEnabled(true);
        },
        
        setAllItemsEnabled: function(isEnabled) {
        },

        onQuestionRendered: function() {
            var editor;
            this.$(".editor").each(function(index) {
                editor = window.ace.edit(this);
                editor.setTheme("ace/theme/monokai");
                editor.setShowPrintMargin(false);
                editor.getSession().setMode("ace/mode/json");
            });
            this.model.set('editor',editor);
            editor.setValue(this.model.get('_defaultValue'));
            this.setReadyStatus();
        },

        clearValidationError: function() {
        },

        // Use to check if the user is allowed to submit the question
        canSubmit: function() {
            return true;
        },

        // Blank method for question to fill out when the question cannot be submitted
        onCannotSubmit: function() {
            this.showValidationError();
        },

        showValidationError: function() {
            this.$(".jsonschema-item-textbox").addClass("jsonschema-validation-error");
        },

        //This preserve the state of the users answers for returning or showing the users answer
        storeUserAnswer: function() {
            //var editor = ace.edit(this.$("#editor"));
            //var userAnswer = editor.getValue();
            var userAnswer = this.model.get('editor').getValue();
            this.model.set("_userAnswer", userAnswer);
        },

        setCorrect: function(correct) {
            this.model.set("_isCorrect",correct)
        },

        setValidationErrors: function(numErrors,errors) {
            this.$('#errors').html(errors);
            this.$('#num-errors').text(numErrors);
            this.$('#error-detail').show();
        },
        
        isCorrect: function() {
            //var editor = ace.edit("#editor");
            var userAnswer = this.model.get('editor').getValue();
            try {
              var input = this.model.get('editor').getValue();
              json = JSON.parse(input);
            } catch (e) {
              if (e instanceof SyntaxError) {
                this.$("#error-detail").hide();
                this.$('#validation-message').html(e);
                this.$('#validation-detail').show();
                this.model.set('_isCorrect',false);
                return false;
              }
            }
            this.$('#validation-detail').hide();
            this.$("#error-detail").hide();
            var type = "event";
            try {
                type = json.type;
            } catch (e) {
                type = "event";
            }
            if (!type) {
                type = "event";
            }
            var schema_file = this.model.get('_schema');
            var foo = this;
            var SCHEMA;
            
            $.ajax({
                url : schema_file,
                dataType : 'json',
                async: false,
                complete : function (data) {
                    SCHEMA=data.responseJSON;
                    SCHEMA["$ref"] = "#/definitions/" + type;
                    var config = {allErrors: true, verbose: true};
                    if (!$("#mode").is(":checked")) {
                        config["removeAdditional"] = "all";
                    }
                    var ajv = new Ajv(config);
                    var validate = ajv.compile(SCHEMA);
                    var valid = validate( json );
                    if (valid) {
                        foo.setCorrect(true);
                        return true;
                    } else {
                        var errors = "";
                        var numErrors = validate.errors.length;
                        if (validate.errors.length > 1) {
                            numErrors += " errors";
                        } else {
                            numErrors += " error";
                        }
                        $.each(validate.errors, function(index, value) {
                            if (value["keyword"] === "additionalProperties") {
                                errors += '<tr><td>' + value["dataPath"] + '</td><td>'
                                    + value["message"] + '</td><td>' + value["params"]["additionalProperty"] + '</td></tr>';
                            }
                            else if (value["keyword"] === "enum") {
                                errors += '<tr><td>' + value["dataPath"] + '</td><td>'
                                    + value["message"] + ' (' + value["params"]["allowedValues"] + ')</td><td>' + value["data"] + '</td></tr>';
                            } else {
                                errors += '<tr><td>' + value["dataPath"] + '</td><td>'
                                   + value["message"] + '</td><td>' + value["data"] + '</td></tr>';
                            }
                        });
                        foo.setValidationErrors(numErrors,errors);
                        foo.setCorrect(false);
                        return false;
                    }
                }
            });
            return(this.model.get('_isCorrect'));
        },

        // Used to set the score based upon the _questionWeight
        setScore: function() {
            var numberOfCorrectAnswers = this.model.get('_numberOfCorrectAnswers');
            var questionWeight = this.model.get("_questionWeight");
            var itemLength = 1;

            var score = questionWeight * numberOfCorrectAnswers / itemLength;

            this.model.set('_score', score);
        },

        // This is important and should give the user feedback on how they answered the question
        // Normally done through ticks and crosses by adding classes
        showMarking: function() {
            if (!this.model.get('_canShowMarking')) return;
        },

        isPartlyCorrect: function() {
            return this.model.get('_isAtLeastOneCorrectSelection');
        },

        resetUserAnswer: function() {
        },

        // Used by the question view to reset the look and feel of the component.
        resetQuestion: function() {
            this.$('.jsonschema-item-textbox').prop('disabled', !this.model.get('_isEnabled')).val('');

            this.model.set({
                _isAtLeastOneCorrectSelection: false,
                _isCorrect: undefined
            });
        },

        showCorrectAnswer: function() {            
        },

        hideCorrectAnswer: function() {
        },

        /**
        * used by adapt-contrib-spoor to get the user's answers in the format required by the cmi.interactions.n.student_response data field
        * returns the user's answers as a string in the format "answer1[,]answer2[,]answer3"
        * the use of [,] as an answer delimiter is from the SCORM 2004 specification for the fill-in interaction type
        */
        getResponse: function() {
            return _.pluck(this.model.get('_items'), 'userAnswer').join('[,]');
        },

        /**
        * used by adapt-contrib-spoor to get the type of this question in the format required by the cmi.interactions.n.type data field
        */
        getResponseType: function() {
            return "fill-in";
        }
    });

    Adapt.register("jsonschema", JsonSchema);

    return JsonSchema;
});
