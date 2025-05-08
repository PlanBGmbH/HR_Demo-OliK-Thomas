# wrappers/azure_audio_transcription_wrapper.py

import azure.cognitiveservices.speech as speechsdk
from azure.cognitiveservices.speech import SpeechRecognizer, AutoDetectSourceLanguageConfig
from utils.secrets_loader import load_secrets
import time

class AzureAudioTranscriptionWrapper:
    def __init__(self):
        secrets = load_secrets()
        # Load Azure Speech SDK credentials from secrets.json
        azure_speech_key = secrets["azure_speech_key"]
        azure_speech_region = secrets["azure_speech_region"]

        # Initialize the speech configuration
        self.speech_config = speechsdk.SpeechConfig(azure_speech_key, azure_speech_region)
    
    def transcribe_audio(self, audio_path):
        """
        Transcribes the given audio file using Azure's Speech-to-Text service.
        :param audio_path: Path to the audio file.
        :return: Transcription text.
        """
        auto_detect = True
        print(f"from azure_audio_transcription_wrapper.py = {audio_path}")
        # Load audio file for transcription
        audio_input = speechsdk.AudioConfig(filename=audio_path)
        
        # Define the possible source languages
        languages = ["en-US", "ar-SA"]  # Replace with desired languages

        # Choose language option based on input
        if auto_detect and languages:

            auto_detect_source_language_config = speechsdk.AutoDetectSourceLanguageConfig(languages=languages)
            print(f"AUODETECT LANGUAGE = {auto_detect_source_language_config}")
            speech_recognizer = speechsdk.SpeechRecognizer(
                speech_config=self.speech_config, 
                audio_config=audio_input, 
                auto_detect_source_language_config=auto_detect_source_language_config
            )
        else:
            # Specify the language explicitly (default to English if not provided)
            language = language or "en-US"
            speech_recognizer = speechsdk.SpeechRecognizer(
                speech_config=self.speech_config, 
                audio_config=audio_input, 
                language=language
            )

        # Container for the transcription results
        all_transcriptions = []

        # Function to handle intermediate results
        def handle_recognized(evt):
            print(f"RECOGNIZED: {evt.result.text}")
            all_transcriptions.append(evt.result.text)

        # Connect to the event handler for recognized speech
        speech_recognizer.recognized.connect(handle_recognized)

        # Start continuous recognition
        speech_recognizer.start_continuous_recognition()

        # Wait for the recognition to complete (you can specify a timeout if needed)
        print("Transcribing...")
        speech_recognizer.session_stopped.connect(lambda evt: print('Session stopped.'))
        speech_recognizer.canceled.connect(lambda evt: print(f"Recognition canceled: {evt.result.text}"))
        speech_recognizer.session_stopped.connect(lambda evt: speech_recognizer.stop_continuous_recognition())

        # Keep the program running until the audio file is completely transcribed
        done = False
        def stop_cb(evt):
            print("Finalizing transcription.")
            nonlocal done
            done = True

        # Set up callback to stop when recognition is done
        speech_recognizer.session_stopped.connect(stop_cb)
        speech_recognizer.canceled.connect(stop_cb)

        # Wait for transcription to finish
        while not done:
            time.sleep(0.1)  # Avoid tight-loop polling

        # Stop recognition after completion
        speech_recognizer.stop_continuous_recognition()

        # Join all transcriptions into a single string
        result = " ".join(all_transcriptions)
        #result = "Welcome to the US Mexico border, a place of sweltering summers and a sweltering debate on immigration and national security. Oh hey, look, there's already a wall. And fences and concrete barricades and gunboats and drones. And SUV's. The border is nearly 2000 miles long. It includes uninhabited desert, major cities and the Rio Grande River. We always hear about border security, and the US spends billions every year on our so-called protection. But what's really going on here? Many things cross the border, from monarch butterflies to heroin to people looking for a better life. 93% of the cocaine consumed in the US comes in through this border, having made its way from South America. That, along with marijuana and methamphetamines, are smuggled through tunnels, on lightweight planes, in car tires, even shot over the border in T-shirt cannons. When the US is the largest market in the world for illegal drugs, there's always a way in. Then there are guns, which flow the other way every year. For an average of 253,000 firearms bought in the US cross into Mexico, and the insane amount of gun dealers on the US side make that really easy. There's three per mile. There are dozens of official entry points along the border lines, and increased security mean it can take hours to get from Juarez to El Paso, a distance of less than a mile. Though many people cross every day for work, school or vacation, we mostly hear about illegal crossings. It's hard to be exact about how many cross. Most of what we know is based on how many people the Border Patrol apprehends, and that number has actually been decreasing. But crossing the border illegally means a lot more than just waiting. It means walking for days on end under the sun over some rugged terrain. It means exhaustion and dehydration. Some migrants hire what are called coyotes to help them across the border. But those coyotes sometimes have ties to the drug trade, and rape and abuse are common. In the last decade, thousands have been found dead while attempting to cross the border. If they do make it across, they face an entire apparatus of Customs and Border Patrol, the largest federal enforcement agency in the nation. It is equipped with guns, drones, towers, ground sensors, helicopters, gunboats and dogs to police the border in what some consider militarization rather than security. Look, it's a border surveillance blimp. The budget for this increased by 75% in the last decade. To 13 1/2 billion dollars a year. Together with what the US spends on ICE, that's more money than the DEA, the FBI, and the Secret Service combined. Between 2004 and 2015, the number of border agents more than doubled. The CBP operates in what the US considers border territory, which is anything 100 miles from the border itself. Here, anyone can be stopped on reasonably suspicious grounds, even if they're a citizen. It's all part of a strategy to stop border crossing through deterrence. The idea that the more people fear crossing, the less likely they are to do it. That might work if you don't mind what it implies. More danger, more deaths, and a ripe market for human smuggling. But is it actually keeping America safer? Despite Trump and other politicians claims ISIS isn't coming across the southern border, there has yet to be a single apprehension of someone with links to the Islamic State. The current wall covers just 653 miles of the border and has already cost the US $7 billion. $5,000,000 per mile in some areas. Experts estimate that to cover the entire border with a wall would cost $25 billion. And that's not even including labor. There are logistical hurdles, too. Because of treaties the US has signed with Mexico, it can't build on the Rio Grande floodplains. And much of the border in Texas is privately owned. And not everyone wants a giant wall in their backyard. So even with all the money in the world and our very own Great Wall of America. Can we ever stop movement across the border by force? And will it make us safer?"
        print(f"Result of Transcription = {result}")

        # Return the full transcription
        return result