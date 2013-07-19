define(['comm/gemini', 'comm/youtrack', 'comm/rally', 'comm/jira'],
    function (GeminiCommunicator, YouTrackCommunicator, RallyCommunicator, JiraCommunicator) {
    var CommunicatorLoader = function (communicatorType) {
        var type = communicatorType || localStorage['CommunicatorType'];
        var result = GeminiCommunicator; // Default one
        switch (type) {
            case 'YouTrack':
                result = YouTrackCommunicator;
                break;
            case 'Jira':
                result = JiraCommunicator;
                break;
            case 'Rally':
                result = RallyCommunicator;
                break;
        }
        return result;
    };
    return CommunicatorLoader;
});