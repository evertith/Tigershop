// Example testing sketch for various DHT humidity/temperature sensors
// Written by ladyada, public domain

#include "DHT.h"
#include "ArduinoJson.h"

#define DHTPIN 12     // what pin we're connected to

// Uncomment whatever type you're using!
#define DHTTYPE DHT11   // DHT 11 
//define DHTTYPE DHT22   // DHT 22  (AM2302)
//#define DHTTYPE DHT21   // DHT 21 (AM2301)

// Connect pin 1 (on the left) of the sensor to +5V
// Connect pin 2 of the sensor to whatever your DHTPIN is
// Connect pin 4 (on the right) of the sensor to GROUND
// Connect a 10K resistor from pin 2 (data) to pin 1 (power) of the sensor

DHT dht(DHTPIN, DHTTYPE);
String incomingByte = "";

void setup() {
  Serial.begin(9600); 
  Serial.println("DHTxx test!");

  pinMode(9, OUTPUT);
  pinMode(8, OUTPUT);
  
  digitalWrite(8, HIGH);
  dht.begin();

  char json[] = "{\"sensor\":\"gps\",\"time\":1351824120,\"data\":[48.756080,2.302038]}";

  StaticJsonBuffer<200> jsonBuffer;
  JsonObject& root = jsonBuffer.parseObject(json);

  if (!root.success()) {
    Serial.println("parseObject() failed");
    return;
  }

  const char* sensor = root["sensor"];
  long time = root["time"];
  double latitude = root["data"][0];
  double longitude = root["data"][1];

  Serial.println(sensor);
  Serial.println(time);
  Serial.println(latitude, 6);
  Serial.println(longitude, 6);
}

void loop() {
  // Reading temperature or humidity takes about 250 milliseconds!
  // Sensor readings may also be up to 2 seconds 'old' (its a very slow sensor)
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  // check if returns are valid, if they are NaN (not a number) then something went wrong!
  if (isnan(t) || isnan(h)) {
    Serial.println("{\"error\":\"Failed to read from DHT11\"}");
  } else {
    Serial.println("{\"humidity\":" + String(h) + ", \"temperature\":" + String(t) + "}");
  }
  
  if (Serial.available() > 0) {
    incomingByte = Serial.readString();
    char json[1028] = "hi";
    
    strncpy(json, incomingByte.c_str(), sizeof(json));
        
    StaticJsonBuffer<200> jsonBuffer;
    JsonObject& root = jsonBuffer.parseObject(json);
  
    if (!root.success()) {
      Serial.println("parseObject() failed");
    }
  
    const char* sensor = root["sensor"];
    int pin = root["pin"];
    int value = root["value"];
  
    Serial.print("I received: ");
    Serial.println(json);
    Serial.println(value);
  }
 }

