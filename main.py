from fastapi import FastAPI , HTTPException
import pandas as pd
from pydantic import BaseModel , Field
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware
import joblib

model = joblib.load("Mental_Health.pkl")

app = FastAPI()


## CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



top_countries = ['Other','India','USA','Canada','Australia','UK','Germany','Mexico','Turkey','France']

class StudentData(BaseModel):
    age                       : int = Field(..., ge = 10 , le = 100 , description= "Enter The Age B/W 10 to 100")
    gender                    : Literal["Male" , "Female"]
    country                   : str
    academic_level            : Literal['Undergraduate', 'Graduate', 'High School'] 
    most_used_platform        : Literal['Facebook', 'LinkedIn', 'Instagram', 'Snapchat','Twitter','YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp','WeChat']
    purpose_of_use            : Literal['Networking', 'Education', 'Entertainment', 'News']
    avg_daily_usage_hours     : float = Field(..., ge = 0 , le = 24 , description= "Enter Daily Hours Use Social Media")
    daily_unlocks             : int = Field(..., ge = 0 , description="Enter Your Daily Unlocks Phone")
    study_hours               : float = Field(..., ge = 0 , le = 24 , description="Enter Your Daily Study Hours")
    physical_activity_hours   : float = Field(..., ge = 0, le = 24 , description="Enter Your Physical Activity Hours")
    sleep_hours_per_night     : float = Field(..., ge = 0 , le= 24 , description="Enter your Sleep Hours")
    stress_level              : Literal['Low' , 'Medium' , 'High' , 'Very High']


class PredictionRecord(BaseModel):
    predicted_mental_health_score : float

@app.get('/')
def Home():
    return{
        "Message" : "Mental Health Stress Prediction",
        "Status" : "Running",
        "EndPoint" : "Send Post Request to Predict Your Mental Health Stree Prediction"
    }

@app.get('/health')
def Health():
    return{
        "Status" : "Running",
        "Model" : "Random Forest Regressor"
        
    }

@app.post('/predict' , response_model=PredictionRecord)
def Predict(data : StudentData):
    try:
        country_group = data.country if data.country in top_countries else 'Other'

        input_df = pd.DataFrame([{
        'Age'                       :data.age,
        'Gender'                    :data.gender,
        'Country'                   :data.country,
        'Academic_Level'            :data.academic_level,
        'Most_Used_Platform'        :data.most_used_platform,
        'Purpose_Of_Use'            :data.purpose_of_use,
        'Avg_Daily_Usage_Hours'     :data.avg_daily_usage_hours,
        'Daily_Unlocks'             :data.daily_unlocks,
        'Study_Hours'               :data.study_hours,
        'Physical_Activity_Hours'   :data.physical_activity_hours,
        'Sleep_Hours_Per_Night'     :data.sleep_hours_per_night,
        'Stress_Level'              :data.stress_level,
        'group_country'             :country_group
        }])

        prediction = model.predict(input_df)[0]
        return PredictionRecord(predicted_mental_health_score=round(float(prediction) , 2 ))

    except Exception as e:
        raise HTTPException(
            status_code= 500,
            detail= f"Prediction failed : {(e)}"
        )

    
