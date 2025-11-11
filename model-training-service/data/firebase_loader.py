import firebase_admin
from firebase_admin import credentials, storage
import pandas as pd
import zipfile
import io

class FirebaseDataLoader:
    def __init__(self, bucket_name: str):
        if not firebase_admin._apps:
            cred = credentials.Certificate('firebase_credentials.json')
            firebase_admin.initialize_app(cred, {
                'storageBucket': bucket_name
            })
        self.bucket = storage.bucket()
    
    def load_track_data(self, track_name: str) -> dict:
        """Load all data files for a specific track"""
        blob = self.bucket.blob(f"datasets/{track_name}.zip")
        zip_data = blob.download_as_bytes()
        
        with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
            return {
                'lap_data': pd.read_csv(z.open('lap_times.csv'), sep=';'),
                'race_data': pd.read_csv(z.open('race_results.csv'), sep=';'),
                'weather_data': pd.read_csv(z.open('weather.csv'), sep=';')
            }
    
    def load_all_tracks(self, tracks: list) -> dict:
        """Load multiple tracks for combined training"""
        all_data = {}
        for track in tracks:
            all_data[track] = self.load_track_data(track)
        return all_data