#!/usr/bin/env python3
"""
Enhanced KMainCMS UX Improvement To-Do Executor with Completion Detection
"""

import re
import json
import os
from pathlib import Path
from datetime import datetime

class TodoExecutorWithDetection:
    def __init__(self, todo_file_path, project_path):
        self.todo_file_path = Path(todo_file_path)
        self.project_path = Path(project_path)
        self.tasks = []
        self.current_index = 0
        self.completion_log = []
        self.load_tasks()
    
    def load_tasks(self):
        """Load and parse tasks from markdown file"""
        with open(self.todo_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse markdown checkboxes
        pattern = r'- \[([ x])\] (.+)'
        matches = re.findall(pattern, content)
        
        self.tasks = []
        for status, description in matches:
            self.tasks.append({
                'completed': status == 'x',
                'description': description.strip(),
                'prompt': self.generate_prompt(description.strip()),
                'detection_pattern': self.generate_detection_pattern(description.strip())
            })
        
        # Find first incomplete task
        for i, task in enumerate(self.tasks):
            if not task['completed']:
                self.current_index = i
                break
        
        print(f"Loaded {len(self.tasks)} tasks from to-do list")
        print(f"First incomplete task: #{self.current_index + 1}")
    
    def generate_prompt(self, task_description):
        """Generate a specific prompt for executing a task"""
        clean_desc = task_description.rstrip('.')
        
        prompt = f"""I need you to implement the following UX improvement task for KMainCMS:

**Task:** {clean_desc}

**Context:**
- This is part of the KMainCMS UX improvement project
- The project is located at: {self.project_path}
- Frontend is in: frontend\\
- Backend is in: backend\\
- The UX design document is at: docs\\KMainCMS_UX_DESIGN_DOCUMENT.md

**Requirements:**
1. Analyze the current implementation in the relevant files
2. Implement the required changes following the design specifications
3. Follow existing code patterns and conventions
4. Test the implementation
5. Update any relevant documentation

**Implementation Guidelines:**
- Use existing components and patterns where possible
- Follow the React/Vite architecture
- Use Tailwind CSS for styling
- Ensure accessibility (ARIA labels, keyboard navigation)
- Make it responsive (mobile, tablet, desktop)
- Add proper error handling

**Please:**
1. First, analyze the current state
2. Then implement the changes
3. Finally, test and verify the implementation

Let me know if you need any clarification about the task requirements."""
        
        return prompt
    
    def generate_detection_pattern(self, task_description):
        """Generate patterns to detect if a task is completed"""
        patterns = []
        
        # Task-specific detection patterns
        desc_lower = task_description.lower()
        
        # Dashboard-related tasks
        if 'dashboard' in desc_lower and 'create' in desc_lower:
            patterns.append({
                'type': 'file_exists',
                'path': 'frontend/src/pages/dashboard',
                'description': 'Dashboard page exists'
            })
        
        # Component creation tasks
        if 'component' in desc_lower and 'create' in desc_lower:
            patterns.append({
                'type': 'file_search',
                'pattern': r'component.*\.(jsx?|tsx?)',
                'description': 'Component file created'
            })
        
        # Color-related tasks
        if 'color' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'#[0-9a-fA-F]{6}',
                'file': 'frontend/src',
                'description': 'Color codes found'
            })
        
        # ARIA/Accessibility tasks
        if 'aria' in desc_lower or 'accessibility' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'aria-',
                'file': 'frontend/src',
                'description': 'ARIA attributes found'
            })
        
        # Status badge tasks
        if 'status badge' in desc_lower:
            patterns.append({
                'type': 'file_exists',
                'path': 'frontend/src/components',
                'pattern': r'StatusBadge',
                'description': 'StatusBadge component exists'
            })
        
        # DataTable tasks
        if 'datatable' in desc_lower or 'data table' in desc_lower:
            patterns.append({
                'type': 'file_exists',
                'path': 'frontend/src/components',
                'pattern': r'DataTable',
                'description': 'DataTable component exists'
            })
        
        # Breadcrumb tasks
        if 'breadcrumb' in desc_lower:
            patterns.append({
                'type': 'file_exists',
                'path': 'frontend/src/components',
                'pattern': r'Breadcrumb',
                'description': 'Breadcrumb component exists'
            })
        
        # Tab navigation tasks
        if 'tab' in desc_lower and 'navigation' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'TabNavigation',
                'file': 'frontend/src',
                'description': 'TabNavigation component found'
            })
        
        # Settings tasks
        if 'settings' in desc_lower and 'organize' in desc_lower:
            patterns.append({
                'type': 'file_exists',
                'path': 'frontend/src/pages/settings',
                'description': 'Settings page exists'
            })
        
        # Spacing tasks
        if 'spacing' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'gap-[0-9]|p-[0-9]|m-[0-9]',
                'file': 'frontend/src',
                'description': 'Spacing classes found'
            })
        
        # Typography tasks
        if 'typography' in desc_lower or 'font' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'text-(xs|sm|base|lg|xl|2xl|3xl|4xl)',
                'file': 'frontend/src',
                'description': 'Typography classes found'
            })
        
        # Modal tasks
        if 'modal' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'Modal',
                'file': 'frontend/src',
                'description': 'Modal component found'
            })
        
        # Form tasks
        if 'form' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'FormField|Input|Select',
                'file': 'frontend/src',
                'description': 'Form components found'
            })
        
        # Permission tasks
        if 'permission' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'permission|Permission',
                'file': 'frontend/src',
                'description': 'Permission code found'
            })
        
        # Loading state tasks
        if 'loading' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'loading|Loading|spinner|Spinner',
                'file': 'frontend/src',
                'description': 'Loading components found'
            })
        
        # Error handling tasks
        if 'error' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'error|Error|try|catch',
                'file': 'frontend/src',
                'description': 'Error handling found'
            })
        
        # Responsive tasks
        if 'responsive' in desc_lower or 'mobile' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'(sm:|md:|lg:|xl:|2xl:)',
                'file': 'frontend/src',
                'description': 'Responsive breakpoints found'
            })
        
        # Generic fallback for other tasks
        if not patterns:
            patterns.append({
                'type': 'manual_verification',
                'description': 'Manual verification required'
            })
        
        return patterns
    
    def detect_completion(self, task):
        """Detect if a task is completed by checking patterns"""
        patterns = task['detection_pattern']
        results = []
        
        for pattern in patterns:
            result = self.check_pattern(pattern)
            results.append(result)
        
        # Task is considered complete if at least one pattern matches
        # or if manual verification is needed (we'll ask user)
        completion_status = any(r['matched'] for r in results if r['type'] != 'manual_verification')
        
        return {
            'completed': completion_status,
            'patterns': results,
            'manual_verification_needed': any(r['type'] == 'manual_verification' for r in results)
        }
    
    def check_pattern(self, pattern):
        """Check if a detection pattern matches"""
        pattern_type = pattern['type']
        
        if pattern_type == 'file_exists':
            return self.check_file_exists(pattern)
        elif pattern_type == 'file_search':
            return self.check_file_search(pattern)
        elif pattern_type == 'code_search':
            return self.check_code_search(pattern)
        elif pattern_type == 'manual_verification':
            return {'type': 'manual_verification', 'matched': False, 'description': pattern['description']}
        else:
            return {'type': 'unknown', 'matched': False, 'description': 'Unknown pattern type'}
    
    def check_file_exists(self, pattern):
        """Check if a file or directory exists"""
        path = self.project_path / pattern['path']
        exists = path.exists()
        
        return {
            'type': 'file_exists',
            'matched': exists,
            'description': pattern['description'],
            'path': str(path),
            'exists': exists
        }
    
    def check_file_search(self, pattern):
        """Search for files matching a pattern"""
        search_path = self.project_path / pattern.get('path', 'frontend/src')
        regex_pattern = pattern['pattern']
        
        matches = []
        if search_path.exists():
            for file in search_path.rglob('*'):
                if file.is_file() and re.search(regex_pattern, file.name, re.IGNORECASE):
                    matches.append(str(file))
        
        return {
            'type': 'file_search',
            'matched': len(matches) > 0,
            'description': pattern['description'],
            'matches': matches[:5],  # Limit to first 5 matches
            'total_matches': len(matches)
        }
    
    def check_code_search(self, pattern):
        """Search for code patterns in files"""
        search_path = self.project_path / pattern.get('file', 'frontend/src')
        regex_pattern = pattern['pattern']
        
        matches = []
        if search_path.exists():
            for file in search_path.rglob('*.{js,jsx,ts,tsx}'):
                if file.is_file():
                    try:
                        with open(file, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            if re.search(regex_pattern, content):
                                matches.append(str(file))
                    except:
                        pass
        
        return {
            'type': 'code_search',
            'matched': len(matches) > 0,
            'description': pattern['description'],
            'matches': matches[:5],
            'total_matches': len(matches)
        }
    
    def get_current_task(self):
        """Get the current task to execute"""
        if self.current_index >= len(self.tasks):
            return None
        
        return self.tasks[self.current_index]
    
    def mark_complete(self, verified=False):
        """Mark current task as complete"""
        if self.current_index < len(self.tasks):
            task = self.tasks[self.current_index]
            task['completed'] = True
            
            # Log completion
            self.completion_log.append({
                'task_number': self.current_index + 1,
                'description': task['description'],
                'completed_at': datetime.now().isoformat(),
                'verified': verified
            })
            
            self.save_progress()
            self.current_index += 1
            return True
        return False
    
    def save_progress(self):
        """Save progress back to markdown file"""
        with open(self.todo_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace checkboxes based on completion status
        for i, task in enumerate(self.tasks):
            old_pattern = f"- [ ] {re.escape(task['description'])}"
            new_pattern = f"- [x] {task['description']}"
            
            if task['completed']:
                content = re.sub(old_pattern, new_pattern, content)
        
        with open(self.todo_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Save completion log
        log_file = self.todo_file_path.parent / 'completion_log.json'
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(self.completion_log, f, indent=2)
    
    def get_progress(self):
        """Get overall progress"""
        completed = sum(1 for task in self.tasks if task['completed'])
        total = len(self.tasks)
        percentage = (completed / total * 100) if total > 0 else 0
        
        return {
            'completed': completed,
            'total': total,
            'percentage': percentage,
            'current': self.current_index + 1
        }
    
    def verify_current_task(self):
        """Verify if current task is completed"""
        current_task = self.get_current_task()
        if current_task:
            return self.detect_completion(current_task)
        return None

def main():
    # Initialize executor
    todo_file = "D:\\Kiserian Main SDA Communications Department\\KMainCMS\\todo-lists\\UX_IMPROVEMENT_TODO.md"
    project_path = "D:\\Kiserian Main SDA Communications Department\\KMainCMS"
    executor = TodoExecutorWithDetection(todo_file, project_path)
    
    print("\n" + "="*60)
    print("KMainCMS UX Improvement To-Do Executor with Detection")
    print("="*60 + "\n")
    
    while True:
        # Show progress
        progress = executor.get_progress()
        print(f"\nProgress: {progress['completed']}/{progress['total']} tasks completed ({progress['percentage']:.1f}%)")
        print(f"Current task: #{progress['current']}\n")
        
        # Get current task
        current_task = executor.get_current_task()
        
        if current_task is None:
            print("\n🎉 All tasks completed!")
            break
        
        # Show current task
        print(f"Task: {current_task['description']}")
        print(f"Status: {'✅ Completed' if current_task['completed'] else '⏳ Pending'}")
        
        # Show prompt
        print("\n" + "="*60)
        print("GENERATED PROMPT:")
        print("="*60)
        print(current_task['prompt'])
        print("="*60 + "\n")
        
        # Menu options
        print("Options:")
        print("1. Copy prompt to clipboard (manual execution)")
        print("2. Mark as complete (manual verification)")
        print("3. Verify completion (automatic detection)")
        print("4. Skip this task")
        print("5. Show detection patterns for this task")
        print("6. Export completion log")
        print("7. Exit")
        
        choice = input("\nEnter choice (1-7): ").strip()
        
        if choice == '1':
            print("\n" + "="*60)
            print("COPY THIS PROMPT:")
            print("="*60)
            print(current_task['prompt'])
            print("="*60)
            print("\nPaste this prompt in the chat to execute the task.")
            print("After completion, return here and choose option 2 or 3.")
        
        elif choice == '2':
            executor.mark_complete(verified=False)
            print("✅ Task marked as complete (manual verification)")
        
        elif choice == '3':
            print("\nVerifying task completion...")
            verification = executor.verify_current_task()
            
            print(f"\nVerification Results:")
            print(f"Completed: {verification['completed']}")
            print(f"Manual Verification Needed: {verification['manual_verification_needed']}")
            
            print(f"\nPattern Checks:")
            for pattern in verification['patterns']:
                status = "✅" if pattern['matched'] else "❌"
                print(f"{status} {pattern['description']}")
                if pattern.get('matches'):
                    print(f"   Found in: {', '.join(pattern['matches'][:3])}")
            
            if verification['completed']:
                confirm = input("\nTask appears to be completed. Mark as complete? (y/n): ").strip().lower()
                if confirm == 'y':
                    executor.mark_complete(verified=True)
                    print("✅ Task marked as complete (verified)")
            else:
                print("\n⚠️  Task completion not detected. Manual verification needed.")
        
        elif choice == '4':
            executor.current_index += 1
            print("⏭️  Task skipped (not recommended)")
        
        elif choice == '5':
            print(f"\nDetection Patterns for: {current_task['description']}")
            for pattern in current_task['detection_pattern']:
                print(f"\nType: {pattern['type']}")
                print(f"Description: {pattern['description']}")
                if 'path' in pattern:
                    print(f"Path: {pattern['path']}")
                if 'pattern' in pattern:
                    print(f"Pattern: {pattern['pattern']}")
        
        elif choice == '6':
            log_file = executor.todo_file_path.parent / 'completion_log.json'
            print(f"\nCompletion log saved to: {log_file}")
            print(f"Total completions logged: {len(executor.completion_log)}")
        
        elif choice == '7':
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
