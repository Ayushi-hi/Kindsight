from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        protected_namespaces=("settings_",),
    )

    app_name: str = "Kindsight"
    debug: bool = True
    frontend_origin: str = "http://localhost:3000"

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "radintel"

    chroma_persist_dir: str = "./chroma_data"
    chroma_collection: str = "pneumonia_knowledge"

    upload_dir: str = "./uploads"

    use_mock_model: bool = True
    model_path: str = "./ml_models/efficientnet_b0_pneumonia.pt"

    # Multi-label (14-condition) model - separate toggle so the original
    # pneumonia-only pipeline keeps working unchanged unless this is turned on
    use_multilabel_model: bool = False
    multilabel_model_path: str = "./ml_models/efficientnet_b0_chestxray14_full.pt"

    openrouter_api_key: str = ""
    llm_model: str = "meta-llama/llama-3.3-70b-instruct:free"


settings = Settings()