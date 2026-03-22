import os
import glob
from sentence_transformers import SentenceTransformer, util
import time
import json

KNOWLEDGE_BASE_DIR = "knowledge_base"

# Base content for initialization
base_content = {
    "skills.md": """## Python
category: programming
domain: software_development

## SQL
category: database
domain: data_engineering

## Docker
category: devops
domain: system_architecture

## React
category: framework
domain: frontend_development
""",
    "job_roles.md": """## Data Scientist
required_skills:
* Python
* SQL
* Machine Learning
optional_skills:
* TensorFlow
* PyTorch
domain: data_science

## Frontend Engineer
required_skills:
* HTML
* CSS
* JavaScript
* React
optional_skills:
* TypeScript
* Next.js
domain: software_development
""",
    "tech_stacks.md": """## MERN Stack
components:
* MongoDB
* Express.js
* React
* Node.js
domain: web_development

## LAMP Stack
components:
* Linux
* Apache
* MySQL
* PHP
domain: web_development
""",
    "interview_topics.md": """## System Design
description: Architecture of scalable distributed systems.
key_concepts:
* Load balancing
* Caching
* Database sharding
* Microservices

## Behavioral
description: Assessing past behavior to predict future performance.
key_concepts:
* STAR method
* Conflict resolution
* Leadership
""",
    "skill_domains.md": """## Software Development
description: Creating and maintaining applications and systems.
key_roles: Frontend Engineer, Backend Engineer, Fullstack Developer

## Data Science
description: Extracting insights from unstructured and structured data.
key_roles: Data Scientist, Data Analyst, Machine Learning Engineer
"""
}

class KnowledgeBaseLoader:
    def __init__(self):
        self.directory = KNOWLEDGE_BASE_DIR
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.entries = []
        self.embeddings = None
        self.last_update = 0
        self.file_stats = {}
        
        self.initialize_kb()
        self.load_kb()

    def initialize_kb(self):
        if not os.path.exists(self.directory):
            os.makedirs(self.directory)
            
        for filename, content in base_content.items():
            filepath = os.path.join(self.directory, filename)
            if not os.path.exists(filepath):
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)

    def load_kb(self):
        self.entries = []
        self.file_stats = {}
        
        md_files = glob.glob(os.path.join(self.directory, "*.md"))
        texts_for_embedding = []
        
        for filepath in md_files:
            filename = os.path.basename(filepath)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Parse entries separated by ##
            blocks = content.split("## ")
            entity_count = 0
            for block in blocks:
                block = block.strip()
                if not block:
                    continue
                # The entity text includes the title and the content
                full_text = f"## {block}"
                
                entry = {
                    "source_file": filename,
                    "content": full_text
                }
                self.entries.append(entry)
                texts_for_embedding.append(full_text)
                entity_count += 1
                
            self.file_stats[filename] = entity_count
            
        if texts_for_embedding:
            self.embeddings = self.model.encode(texts_for_embedding, convert_to_tensor=True)
            
        self.last_update = time.time()
        print(f"Loaded {len(self.entries)} entries from {len(md_files)} files in Knowledge Base.")

    def reload(self):
        self.load_kb()

    def get_status(self):
        return {
            "loaded_files": list(self.file_stats.keys()),
            "entity_counts": self.file_stats,
            "total_entities": len(self.entries),
            "last_update_timestamp": self.last_update
        }

    def retrieve_knowledge(self, query, top_k=3):
        if not self.entries or self.embeddings is None:
            return []
            
        query_embedding = self.model.encode(query, convert_to_tensor=True)
        cos_scores = util.cos_sim(query_embedding, self.embeddings)[0]
        
        top_results = []
        # Get top k results
        if len(cos_scores) > 0:
            top_k = min(top_k, len(cos_scores))
            top_results_idx = cos_scores.topk(k=top_k)
            
            for score, idx in zip(top_results_idx[0], top_results_idx[1]):
                if score > 0.3: # Threshold
                    top_results.append(self.entries[idx]["content"])
                    
        return top_results

# Singleton instance
kb = KnowledgeBaseLoader()
