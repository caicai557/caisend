use super::intent::intents;
use super::intent_classifier::IntentClassifier;
use anyhow::Result;

/// Load default English intent templates into the classifier
/// 
/// Provides example phrases for 18 different intent types
pub fn load_default_templates(classifier: &mut IntentClassifier) -> Result<()> {
    // Greetings
    classifier.add_intent_template(
        intents::GREETING,
        vec![
            "hello", "hi", "hey", "good morning", "good afternoon",
            "good evening", "howdy", "greetings", "what's up", "sup"
        ]
    )?;
    
    // Farewells
    classifier.add_intent_template(
        intents::FAREWELL,
        vec![
            "goodbye", "bye", "see you", "farewell", "take care",
            "later", "catch you later", "have a good day", "peace"
        ]
    )?;
    
    // Questions
    classifier.add_intent_template(
        intents::QUESTION,
        vec![
            "what is", "how do", "why does", "when will", "where can",
            "who is", "which one", "can you explain", "tell me about",
            "what about", "how about"
        ]
    )?;
    
    // Help Requests
    classifier.add_intent_template(
        intents::HELP_REQUEST,
        vec![
            "help me", "I need help", "can you help", "assist me",
            "I'm stuck", "I don't understand", "show me how",
            "guide me", "support needed"
        ]
    )?;
    
    // Clarification
    classifier.add_intent_template(
        intents::CLARIFICATION,
        vec![
            "what do you mean", "I don't get it", "can you clarify",
            "please explain", "I'm confused", "could you repeat",
            "say that again", "elaborate"
        ]
    )?;
    
    // Confirmation
    classifier.add_intent_template(
        intents::CONFIRMATION,
        vec![
            "yes", "yeah", "sure", "okay", "alright", "correct",
            "that's right", "exactly", "absolutely", "definitely",
            "of course", "indeed"
        ]
    )?;
    
    // Rejection
    classifier.add_intent_template(
        intents::REJECTION,
        vec![
            "no", "nope", "nah", "not really", "I don't think so",
            "negative", "never", "cancel", "stop", "no thanks"
        ]
    )?;
    
    // Agreement
    classifier.add_intent_template(
        intents::AGREEMENT,
        vec![
            "I agree", "I concur", "you're right", "that makes sense",
            "fair enough", "I see your point", "sounds good",
            "works for me"
        ]
    )?;
    
    // Disagreement
    classifier.add_intent_template(
        intents::DISAGREEMENT,
        vec![
            "I disagree", "I don't agree", "that's not right",
            "I think otherwise", "not quite", "I beg to differ",
            "actually no"
        ]
    )?;
    
    // Request
    classifier.add_intent_template(
        intents::REQUEST,
        vec![
            "could you", "would you", "please", "can you",
            "I would like", "I want", "I need", "send me",
            "give me", "show me"
        ]
    )?;
    
    // Command
    classifier.add_intent_template(
        intents::COMMAND,
        vec![
            "do this", "start", "stop", "run", "execute",
            "perform", "activate", "deactivate", "enable", "disable"
        ]
    )?;
    
    // Suggestion
    classifier.add_intent_template(
        intents::SUGGESTION,
        vec![
            "how about", "what if", "you should", "try this",
            "consider", "maybe", "perhaps", "I suggest",
            "why don't you"
        ]
    )?;
    
    // Thanks
    classifier.add_intent_template(
        intents::THANKS,
        vec![
            "thank you", "thanks", "appreciate it", "grateful",
            "much appreciated", "thanks a lot", "thank you very much",
            "cheers"
        ]
    )?;
    
    // Apology
    classifier.add_intent_template(
        intents::APOLOGY,
        vec![
            "sorry", "my bad", "my apologies", "I apologize",
            "forgive me", "excuse me", "pardon me", "I'm sorry"
        ]
    )?;
    
    // Complaint
    classifier.add_intent_template(
        intents::COMPLAINT,
        vec![
            "this is wrong", "not working", "broken", "issue",
            "problem", "doesn't work", "frustrated", "annoying",
            "terrible", "disappointed"
        ]
    )?;
    
    // Praise
    classifier.add_intent_template(
        intents::PRAISE,
        vec![
            "great", "awesome", "excellent", "amazing", "wonderful",
            "fantastic", "perfect", "brilliant", "love it",
            "well done", "impressive"
        ]
    )?;
    
    // Acknowledgment
    classifier.add_intent_template(
        intents::ACKNOWLEDGMENT,
        vec![
            "I see", "got it", "understood", "noted", "makes sense",
            "I understand", "clear", "roger that", "copy that"
        ]
    )?;
    
    // Waiting
    classifier.add_intent_template(
        intents::WAITING,
        vec![
            "wait", "hold on", "one moment", "give me a sec",
            "just a minute", "be right back", "brb", "standby"
        ]
    )?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::inference::CognitionService;
    use std::sync::Arc;
    
    // Mock test helper - in real tests you'd use actual CognitionService
    fn create_test_classifier() -> IntentClassifier {
        // For testing purposes, we'd need a mock CognitionService
        // This is a placeholder - actual tests would use proper setup
        todo!("Create mock CognitionService for testing")
    }
    
    #[test]
    #[ignore = "Requires CognitionService setup"]
    fn test_load_templates() {
        let mut classifier = create_test_classifier();
        let result = load_default_templates(&mut classifier);
        assert!(result.is_ok());
    }
}
