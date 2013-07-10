define(['comm/gemini', 'comm/youtrack', 'comm/fieldInfo'], function (GeminiCommunicator, YouTrackCommunicator) {
    var CommunicatorLoader = function (communicatorType) {
        var type = communicatorType || localStorage['CommunicatorType'];
        var result = GeminiCommunicator; // Default one
        switch (type) {
            case 'YouTrack':
                result = YouTrackCommunicator;
                break;
        }
        return result;
    };
    return CommunicatorLoader;
});