define(['comm/communicator', 'comm/gemini', 'comm/youtrack', 'comm/rally', 'comm/jira', 'comm/redmine'],
    function (Communicator, GeminiCommunicator, YouTrackCommunicator, RallyCommunicator, JiraCommunicator, RedmineCommunicator) {
    var CommunicatorLoader = function (communicatorType) {
        var type = communicatorType || localStorage['CommunicatorType'];
        var result = Communicator; // Default one
        switch (type) {
            case 'Gemini':
                result = GeminiCommunicator;
                break;
            case 'YouTrack':
                result = YouTrackCommunicator;
                break;
            case 'Jira':
                result = JiraCommunicator;
                break;
            case 'Rally':
                result = RallyCommunicator;
                break;
            case 'Redmine':
                result = RedmineCommunicator;
                break;
        }
        return result;
    };
    return CommunicatorLoader;
});