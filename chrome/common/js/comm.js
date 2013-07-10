define(['comm/gemini', 'comm/youtrack', 'comm/rally', 'comm/fieldInfo'],
    function (GeminiCommunicator, YouTrackCommunicator, RallyCommunicator) {
    var CommunicatorLoader = function (communicatorType) {
        var type = communicatorType || localStorage['CommunicatorType'];
        var result = GeminiCommunicator; // Default one
        switch (type) {
            case 'YouTrack':
                result = YouTrackCommunicator;
                break;
            case 'Rally':
                result = RallyCommunicator;
                break;
        }
        return result;
    };
    return CommunicatorLoader;
});