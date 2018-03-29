module.exports = function(RED) {
    'use strict';

    var AWS = require('aws-sdk');
    var slug = require('slug');
    var fs = require('fs');
    var mkdirp = require('mkdirp');
    var MD5 = require('crypto-js').MD5;
    var util = require('util');
    var path = require('path');
    var pathExists = require('path-exists');
    var _ = require('lodash');
    var os = require('os'); // Retrieve the local IP
    var sonos = require('sonos');
	var aMessageQueue=[]; // Array of incoming TTS messages
    var sonos = require('sonos');
    var SonosClient;
    var iVoice;
    var sNoderedURL; // Stores the node.red URL and port
    var oTimer;

    AWS.config.update({
        region: 'us-east-1'
    });

    slug.charmap['.'] = '_stop_';
    slug.charmap['?'] = '_qm_';
    slug.charmap['!'] = '_em_';
    slug.charmap[','] = '_pause_';
    slug.charmap[':'] = '_colon_';
    slug.charmap[';'] = '_semicolon_';
    slug.charmap['<'] = '_less_';
    slug.charmap['>'] = '_greater_';

    function setupDirectory(aPath) {
        try {
            return fs.statSync(aPath).isDirectory();
        } catch (e) {

            // Path does not exist
            if (e.code === 'ENOENT') {
                // Try and create it
                try {
                    mkdirp.sync(aPath);
                    RED.log.info('Created directory path: ' + aPath);
                    return true;
                } catch (e) {
                    RED.log.error('Failed to create path: ' + aPath);
                }
            }
            // Otherwise failure
            return false;
        }
    }

    var voices = {
        '0': {
            Gender: 'Female',
            Id: 'Joanna',
            LanguageCode: 'en-US',
            LanguageName: 'US English',
            Name: 'Joanna'
        },
        '1': {
            Gender: 'Female',
            Id: 'Mizuki',
            LanguageCode: 'ja-JP',
            LanguageName: 'Japanese',
            Name: 'Mizuki'
        },
        '2': {
            Gender: 'Female',
            Id: 'Filiz',
            LanguageCode: 'tr-TR',
            LanguageName: 'Turkish',
            Name: 'Filiz'
        },
        '3': {
            Gender: 'Female',
            Id: 'Astrid',
            LanguageCode: 'sv-SE',
            LanguageName: 'Swedish',
            Name: 'Astrid'
        },
        '4': {
            Gender: 'Male',
            Id: 'Maxim',
            LanguageCode: 'ru-RU',
            LanguageName: 'Russian',
            Name: 'Maxim'
        },
        '5': {
            Gender: 'Female',
            Id: 'Tatyana',
            LanguageCode: 'ru-RU',
            LanguageName: 'Russian',
            Name: 'Tatyana'
        },
        '6': {
            Gender: 'Female',
            Id: 'Carmen',
            LanguageCode: 'ro-RO',
            LanguageName: 'Romanian',
            Name: 'Carmen'
        },
        '7': {
            Gender: 'Female',
            Id: 'Ines',
            LanguageCode: 'pt-PT',
            LanguageName: 'Portuguese',
            Name: 'Inês'
        },
        '8': {
            Gender: 'Male',
            Id: 'Cristiano',
            LanguageCode: 'pt-PT',
            LanguageName: 'Portuguese',
            Name: 'Cristiano'
        },
        '9': {
            Gender: 'Female',
            Id: 'Vitoria',
            LanguageCode: 'pt-BR',
            LanguageName: 'Brazilian Portuguese',
            Name: 'Vitória'
        },
        '10': {
            Gender: 'Male',
            Id: 'Ricardo',
            LanguageCode: 'pt-BR',
            LanguageName: 'Brazilian Portuguese',
            Name: 'Ricardo'
        },
        '11': {
            Gender: 'Female',
            Id: 'Maja',
            LanguageCode: 'pl-PL',
            LanguageName: 'Polish',
            Name: 'Maja'
        },
        '12': {
            Gender: 'Male',
            Id: 'Jan',
            LanguageCode: 'pl-PL',
            LanguageName: 'Polish',
            Name: 'Jan'
        },
        '13': {
            Gender: 'Female',
            Id: 'Ewa',
            LanguageCode: 'pl-PL',
            LanguageName: 'Polish',
            Name: 'Ewa'
        },
        '14': {
            Gender: 'Male',
            Id: 'Ruben',
            LanguageCode: 'nl-NL',
            LanguageName: 'Dutch',
            Name: 'Ruben'
        },
        '15': {
            Gender: 'Female',
            Id: 'Lotte',
            LanguageCode: 'nl-NL',
            LanguageName: 'Dutch',
            Name: 'Lotte'
        },
        '16': {
            Gender: 'Female',
            Id: 'Liv',
            LanguageCode: 'nb-NO',
            LanguageName: 'Norwegian',
            Name: 'Liv'
        },
        '17': {
            Gender: 'Male',
            Id: 'Giorgio',
            LanguageCode: 'it-IT',
            LanguageName: 'Italian',
            Name: 'Giorgio'
        },
        '18': {
            Gender: 'Female',
            Id: 'Carla',
            LanguageCode: 'it-IT',
            LanguageName: 'Italian',
            Name: 'Carla'
        },
        '19': {
            Gender: 'Male',
            Id: 'Karl',
            LanguageCode: 'is-IS',
            LanguageName: 'Icelandic',
            Name: 'Karl'
        },
        '20': {
            Gender: 'Female',
            Id: 'Dora',
            LanguageCode: 'is-IS',
            LanguageName: 'Icelandic',
            Name: 'Dóra'
        },
        '21': {
            Gender: 'Male',
            Id: 'Mathieu',
            LanguageCode: 'fr-FR',
            LanguageName: 'French',
            Name: 'Mathieu'
        },
        '22': {
            Gender: 'Female',
            Id: 'Celine',
            LanguageCode: 'fr-FR',
            LanguageName: 'French',
            Name: 'Céline'
        },
        '23': {
            Gender: 'Female',
            Id: 'Chantal',
            LanguageCode: 'fr-CA',
            LanguageName: 'Canadian French',
            Name: 'Chantal'
        },
        '24': {
            Gender: 'Female',
            Id: 'Penelope',
            LanguageCode: 'es-US',
            LanguageName: 'US Spanish',
            Name: 'Penélope'
        },
        '25': {
            Gender: 'Male',
            Id: 'Miguel',
            LanguageCode: 'es-US',
            LanguageName: 'US Spanish',
            Name: 'Miguel'
        },
        '26': {
            Gender: 'Male',
            Id: 'Enrique',
            LanguageCode: 'es-ES',
            LanguageName: 'Castilian Spanish',
            Name: 'Enrique'
        },
        '27': {
            Gender: 'Female',
            Id: 'Conchita',
            LanguageCode: 'es-ES',
            LanguageName: 'Castilian Spanish',
            Name: 'Conchita'
        },
        '28': {
            Gender: 'Male',
            Id: 'Geraint',
            LanguageCode: 'en-GB-WLS',
            LanguageName: 'Welsh English',
            Name: 'Geraint'
        },
        '29': {
            Gender: 'Female',
            Id: 'Salli',
            LanguageCode: 'en-US',
            LanguageName: 'US English',
            Name: 'Salli'
        },
        '30': {
            Gender: 'Female',
            Id: 'Kimberly',
            LanguageCode: 'en-US',
            LanguageName: 'US English',
            Name: 'Kimberly'
        },
        '31': {
            Gender: 'Female',
            Id: 'Kendra',
            LanguageCode: 'en-US',
            LanguageName: 'US English',
            Name: 'Kendra'
        },
        '32': {
            Gender: 'Male',
            Id: 'Justin',
            LanguageCode: 'en-US',
            LanguageName: 'US English',
            Name: 'Justin'
        },
        '33': {
            Gender: 'Male',
            Id: 'Joey',
            LanguageCode: 'en-US',
            LanguageName: 'US English',
            Name: 'Joey'
        },
        '34': {
            Gender: 'Female',
            Id: 'Ivy',
            LanguageCode: 'en-US',
            LanguageName: 'US English',
            Name: 'Ivy'
        },
        '35': {
            Gender: 'Female',
            Id: 'Raveena',
            LanguageCode: 'en-IN',
            LanguageName: 'Indian English',
            Name: 'Raveena'
        },
        '36': {
            Gender: 'Female',
            Id: 'Emma',
            LanguageCode: 'en-GB',
            LanguageName: 'British English',
            Name: 'Emma'
        },
        '37': {
            Gender: 'Male',
            Id: 'Brian',
            LanguageCode: 'en-GB',
            LanguageName: 'British English',
            Name: 'Brian'
        },
        '38': {
            Gender: 'Female',
            Id: 'Amy',
            LanguageCode: 'en-GB',
            LanguageName: 'British English',
            Name: 'Amy'
        },
        '39': {
            Gender: 'Male',
            Id: 'Russell',
            LanguageCode: 'en-AU',
            LanguageName: 'Australian English',
            Name: 'Russell'
        },
        '40': {
            Gender: 'Female',
            Id: 'Nicole',
            LanguageCode: 'en-AU',
            LanguageName: 'Australian English',
            Name: 'Nicole'
        },
        '41': {
            Gender: 'Female',
            Id: 'Marlene',
            LanguageCode: 'de-DE',
            LanguageName: 'German',
            Name: 'Marlene'
        },
        '42': {
            Gender: 'Male',
            Id: 'Hans',
            LanguageCode: 'de-DE',
            LanguageName: 'German',
            Name: 'Hans'
        },
        '43': {
            Gender: 'Female',
            Id: 'Naja',
            LanguageCode: 'da-DK',
            LanguageName: 'Danish',
            Name: 'Naja'
        },
        '44': {
            Gender: 'Male',
            Id: 'Mads',
            LanguageCode: 'da-DK',
            LanguageName: 'Danish',
            Name: 'Mads'
        },
        '45': {
            Gender: 'Female',
            Id: 'Gwyneth',
            LanguageCode: 'cy-GB',
            LanguageName: 'Welsh',
            Name: 'Gwyneth'
        },
        '46': {
            Gender: 'Male',
            Id: 'Jacek',
            LanguageCode: 'pl-PL',
            LanguageName: 'Polish',
            Name: 'Jacek'
        },
        '47': {
            Gender: 'Male',
            Id: 'Matthew',
            LanguageCode: 'en-US',
            LanguageName: 'US English',
            Name: 'Matthew'
        }
    };

    function PollyConfigNode(config) {
        RED.nodes.createNode(this, config);

        RED.log.info('ConfigNode:' + config);

        if (this.credentials) {
            this.accessKey = this.credentials.accessKey;
            this.secretKey = this.credentials.secretKey;
        }
       
        var params = {
            accessKeyId: this.accessKey,
            secretAccessKey: this.secretKey,
            apiVersion: '2016-06-10'
        };
      
        this.polly = new AWS.Polly(params);
     
    }

    RED.nodes.registerType('sonospollytts-config', PollyConfigNode, {
        credentials: {
            accessKey: {
                type: 'text'
            },
            secretKey: {
                type: 'password'
            }
        }
    });

    function PollyNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        this.dir = config.dir;

        
        // Set ssml
        this.ssml = config.ssml;

        this.Pollyconfig = RED.nodes.getNode(config.config);

        this.sonosipaddress=config.sonosipaddress;
        
        if (!this.Pollyconfig) {
            RED.log.error('Missing Polly config');
            return;
        }

        // Set the voice
        iVoice = voices[config.voice].Id;

        // Store Noder-Red complete URL
        sNoderedURL="http://"+ config.noderedipaddress + ":" + config.noderedport;

        // Create sonos client
        SonosClient = new sonos.Sonos(config.sonosipaddress);

        // Start the TTS queue timer
        oTimer=setTimeout(function(){HandleQueue(node);},1000);

       
        this.on('input', function(msg) {
            if(!_.isString(msg.payload)){
                notifyError(node, msg, 'msg.payload must be of type String');
                return;
            }

            // Add the message to the array
            aMessageQueue.push(msg.payload);
            // Log state for debug.
            // RED.log.info('PollyNode - queued: ' + msg.payload);

        });

        this.on('close', function () {
            clearTimeout(oTimer);
        });
    }




    // Handle the queue
    function HandleQueue(node){
       
        SonosClient.getCurrentState().then(state => {

            // Log state for debug.
            // RED.log.info('HandleQueue - State: ' + state);

             
            if (state!="playing")
            {
                // Play next msg
                if (aMessageQueue.length>0) {
            
                    var sMsg=aMessageQueue[0];
                    
                    // Remove the TTS message from the queue
                    aMessageQueue.splice(0,1);
                    
                    // Create the TTS mp3 with Polly
                    Leggi(sMsg,node);
                    
                    // Set higher timeout, because i must wait until polly loaded the file and the playstate changed
                    oTimer=setTimeout(function(){HandleQueue(node);},4000);
                    
                }else
                {
                    // Start the TTS queue timer
                    oTimer=setTimeout(function(){HandleQueue(node);},1000);
                    //RED.log.info('HandleQueue - iscribonisso: 1');
                }

            }else
            {

                // It's playing something. Check what's playing.
                // If Music, then stop the music and play the TTS message
                // If playing TTS message, waits until it's finished.
                SonosClient.currentTrack().then(track => {
                            
                   /*  // Log state for debug.
                    RED.log.info('HandleQueue - Track: ' + track); */


                  }).catch(err => { 
                    node.error(JSON.stringify(err));
                    node.status({fill:"red", shape:"dot", text:"failed to retrieve current track"});
                   });

                // Start the TTS queue timer
                oTimer=setTimeout(function(){HandleQueue(node);},1000);
                //RED.log.info('HandleQueue - iscribonisso: 2');

            }
		
          }).catch(err => { console.log('Error occurred %j', err) })

        
       
        
    }




    // Reas the text via Polly
    function Leggi(msg,node)
    {
            // Log
            //RED.log.info('Leggi: ' + msg);

            var polly = node.Pollyconfig.polly;
            var outputFormat = 'mp3';

            var filename = getFilename(msg, iVoice, node.ssml, outputFormat);

            var cacheDir = node.dir;

            if (!setupDirectory(cacheDir)) {
                notifyError(node, msg, 'Unable to set up cache directory: ' + cacheDir);
                return;
            }

            // Store it
            filename = path.join(node.dir, filename);

             // Log
           RED.log.info('Leggi filename: ' + filename);

            // Check if cached
                pathExists(filename).then(cached => {
                if (cached) {
                    // Cached
                    // Play
                    PlaySonos(filename);
                    return;
                    //return node.send([msg, null]);
                }

                // Not cached
                node.status({
                fill: 'yellow',
                shape: 'dot',
                text: 'requesting'
            });

           
            var params = {
                OutputFormat: outputFormat,
                SampleRate: '22050',
                Text: msg,
                TextType: node.ssml ? 'ssml' : 'text',
                VoiceId: iVoice
            };

            synthesizeSpeech([polly, params])
                .then(data => {
                  // Play
                //PlaySonos(filename);
                
                return [filename, data.AudioStream];

            }).then(cacheSpeech).then(function() {
                    // Success
                    node.status({});
                    //node.send([msg, null]);

                    // Play
                    PlaySonos(filename);


                }).catch(error => {
                notifyError(node, filename, error);
                 });
        });
    }

    function synthesizeSpeech([polly, params]){
        return new Promise((resolve, reject) => {
            polly.synthesizeSpeech(params, function(err, data) {
            if (err !== null) {
                return reject(err);
            }

            resolve(data);
        });
    });
    }

    function cacheSpeech([path, data]){
        return new Promise((resolve, reject) => {
            fs.writeFile(path, data, function(err) {
            if (err !== null) return reject(err);
            resolve();
        });
    });
    }

    function getFilename(text, iVoice, isSSML, extension) {
        // Slug the text.
        var basename = slug(text);

        var ssml_text = isSSML ? '_ssml' : '';

        // Filename format: "text_voice.mp3"
        var filename = util.format('%s_%s%s.%s', basename, iVoice, ssml_text, extension);

        // If filename is too long, cut it and add hash
        if (filename.length > 250) {
            var hash = MD5(basename);

            // Filename format: "text_hash_voice.mp3"
            var ending = util.format('_%s_%s%s.%s', hash, iVoice, ssml_text, extension);
            var beginning = basename.slice(0, 250 - ending.length);

            filename = beginning + ending;
        }

        return filename;
    }

    RED.nodes.registerType('sonospollytts', PollyNode);

    function notifyError(node, msg, err) {
        var errorMessage = _.isString(err) ? err : err.message;
        // Output error to console
        RED.log.error(errorMessage);
        // Mark node as errounous
        node.status({
            fill: 'red',
            shape: 'dot',
            text: 'Error: ' + errorMessage
        });

        // Set error in message
        msg.error = errorMessage;

        // Send message
        //node.send([null, msg]);
    }



   

// ---------------------- SONOS ----------------------------
        function PlaySonos(_songuri)
        {
            var sUrl= sNoderedURL + "/tts/tts.mp3?f=" + encodeURIComponent(_songuri);
            
            
            // Log
            RED.log.info("Playsonos requesting: " + sUrl);

              SonosClient.play(sUrl).then(success => {
                    RED.log.info("Playsonos playing notification: " + success);
              }).catch(err => { RED.log.info("Playsonos playing error: " + err)  });

        }

        RED.httpAdmin.get("/tts/tts.mp3", function(req, res) {
            try {
                var url = require('url');
                var url_parts = url.parse(req.url, true);
                var query = url_parts.query;
               //res.download(query.f);

                res.setHeader('Content-Disposition', 'attachment; filename=tts.mp3')
                if (fs.existsSync(query.f)) {
                    var readStream = fs.createReadStream(query.f);
                    readStream.pipe(res);
                    res.end;
                }else
                {
                    RED.log.info("Playsonos RED.httpAdmin file not found: " + query.f);
                    res.write("File not found");
                    res.end();
                }
              
            } catch (error) {
                RED.log.info("Playsonos RED.httpAdmin error: " + error + " on: " + query.f);
            }
            
        });

}
