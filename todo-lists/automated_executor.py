#!/usr/bin/env python3
"""
Fully Automated KMainCMS UX Improvement Executor
Processes tasks sequentially with automatic completion detection and feedback
"""

import re
import json
import os
from pathlib import Path
from datetime import datetime

class AutomatedTodoExecutor:
    def __init__(self, todo_file_path, project_path):
        self.todo_file_path = Path(todo_file_path)
        self.project_path = Path(project_path)
        self.tasks = []
        self.current_index = 0
        self.session_log = []
        self.feedback_summary = []
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
        print(f"Starting from task: #{self.current_index + 1}")
    
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

**Completion Feedback:**
After completing this task, please provide a brief summary of:
- What files were modified/created
- What specific changes were made
- Any issues encountered
- Whether the task was fully completed

**Please:**
1. First, analyze the current state
2. Then implement the changes
3. Finally, test and verify the implementation
4. Provide completion feedback summary

Let me know if you need any clarification about the task requirements."""
        
        return prompt
    
    def generate_detection_pattern(self, task_description):
        """Generate patterns to detect if a task is completed"""
        patterns = []
        desc_lower = task_description.lower()
        
        # Enhanced detection patterns
        if 'dashboard' in desc_lower and 'create' in desc_lower:
            patterns.append({
                'type': 'file_exists',
                'path': 'frontend/src/pages/dashboard',
                'description': 'Dashboard page exists'
            })
        
        if 'component' in desc_lower and 'create' in desc_lower:
            patterns.append({
                'type': 'file_search',
                'pattern': r'component.*\.(jsx?|tsx?)',
                'description': 'Component file created'
            })
        
        if 'color' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'#[0-9a-fA-F]{6}',
                'file': 'frontend/src',
                'description': 'Color codes found'
            })
        
        if 'aria' in desc_lower or 'accessibility' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'aria-',
                'file': 'frontend/src',
                'description': 'ARIA attributes found'
            })
        
        if 'status badge' in desc_lower:
            patterns.append({
                'type': 'file_exists',
                'path': 'frontend/src/components',
                'pattern': r'StatusBadge',
                'description': 'StatusBadge component exists'
            })
        
        if 'datatable' in desc_lower or 'data table' in desc_lower:
            patterns.append({
                'type': 'file_exists',
                'path': 'frontend/src/components',
                'pattern': r'DataTable',
                'description': 'DataTable component exists'
            })
        
        if 'breadcrumb' in desc_lower:
            patterns.append({
                'type': 'file_exists',
                'path': 'frontend/src/components',
                'pattern': r'Breadcrumb',
                'description': 'Breadcrumb component exists'
            })
        
        if 'tab' in desc_lower and 'navigation' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'TabNavigation',
                'file': 'frontend/src',
                'description': 'TabNavigation component found'
            })
        
        if 'settings' in desc_lower and 'organize' in desc_lower:
            patterns.append({
                'type': 'file_exists',
                'path': 'frontend/src/pages/settings',
                'description': 'Settings page exists'
            })
        
        if 'spacing' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'gap-[0-9]|p-[0-9]|m-[0-9]',
                'file': 'frontend/src',
                'description': 'Spacing classes found'
            })
        
        if 'typography' in desc_lower or 'font' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'text-(xs|sm|base|lg|xl|2xl|3xl|4xl)',
                'file': 'frontend/src',
                'description': 'Typography classes found'
            })
        
        if 'modal' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'Modal',
                'file': 'frontend/src',
                'description': 'Modal component found'
            })
        
        if 'form' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'FormField|Input|Select',
                'file': 'frontend/src',
                'description': 'Form components found'
            })
        
        if 'permission' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'permission|Permission',
                'file': 'frontend/src',
                'description': 'Permission code found'
            })
        
        if 'loading' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'loading|Loading|spinner|Spinner',
                'file': 'frontend/src',
                'description': 'Loading components found'
            })
        
        if 'error' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'error|Error|try|catch',
                'file': 'frontend/src',
                'description': 'Error handling found'
            })
        
        if 'responsive' in desc_lower or 'mobile' in desc_lower:
            patterns.append({
                'type': 'code_search',
                'pattern': r'(sm:|md:|lg:|xl:|2xl:)',
                'file': 'frontend/src',
                'description': 'Responsive breakpoints found'
            })
        
        if not patterns:
            patterns.append({
                'type': 'manual_verification',
                'description': 'Manual verification required'
            })
        
        return patterns
    
    def detect_completion(self, task, completion_feedback):
        """Detect if a task is completed based on patterns and feedback"""
        patterns = task['detection_pattern']
        results = []
        
        # Check code patterns
        for pattern in patterns:
            if pattern['type'] != 'manual_verification':
                result = self.check_pattern(pattern)
                results.append(result)
        
        # Check completion feedback
        feedback_completed = self.analyze_completion_feedback(completion_feedback)
        
        # Task is complete if patterns match OR feedback indicates completion
        code_completion = any(r['matched'] for r in results)
        feedback_completion = feedback_completed['completed']
        
        return {
            'completed': code_completion or feedback_completion,
            'code_patterns': results,
            'feedback_analysis': feedback_completed,
            'detection_method': 'code' if code_completion else 'feedback' if feedback_completion else 'manual'
        }
    
    def analyze_completion_feedback(self, feedback):
        """Analyze completion feedback to determine if task is complete"""
        if not feedback:
            return {'completed': False, 'confidence': 0, 'reason': 'No feedback provided'}
        
        feedback_lower = feedback.lower()
        
        # Positive indicators
        positive_indicators = [
            'completed', 'done', 'finished', 'implemented', 'created',
            'added', 'updated', 'modified', 'successfully', 'working',
            'task completed', 'fully implemented', 'changes made'
        ]
        
        # Negative indicators
        negative_indicators = [
            'failed', 'error', 'issue', 'problem', 'not completed',
            'incomplete', 'skip', 'cannot', 'unable', 'blocked'
        ]
        
        positive_count = sum(1 for indicator in positive_indicators if indicator in feedback_lower)
        negative_count = sum(1 for indicator in negative_indicators if indicator in feedback_lower)
        
        # Check for file modifications mentioned
        file_modification_indicators = [
            'modified', 'created', 'updated', 'changed', 'edited',
            'wrote', 'added file', 'created file', 'updated file'
        ]
        file_modification_count = sum(1 for indicator in file_modification_indicators if indicator in feedback_lower)
        
        # Calculate confidence
        if positive_count > 0 and negative_count == 0:
            confidence = min(100, 60 + positive_count * 10 + file_modification_count * 5)
            completed = True
        elif positive_count > negative_count:
            confidence = min(100, 40 + (positive_count - negative_count) * 10)
            completed = True
        elif negative_count > 0:
            confidence = 0
            completed = False
        else:
            confidence = 50
            completed = False
        
        return {
            'completed': completed,
            'confidence': confidence,
            'reason': 'Positive indicators found' if completed else 'Negative indicators or no clear indicators',
            'positive_count': positive_count,
            'negative_count': negative_count,
            'file_modification_count': file_modification_count
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
            'matches': matches[:5],
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
    
    def process_task(self, completion_feedback=None):
        """Process current task with completion detection"""
        current_task = self.get_current_task()
        
        if current_task is None:
            return {'status': 'all_complete', 'message': 'All tasks completed'}
        
        # Detect completion
        detection = self.detect_completion(current_task, completion_feedback)
        
        if detection['completed']:
            # Mark as complete
            current_task['completed'] = True
            
            # Log completion
            self.session_log.append({
                'task_number': self.current_index + 1,
                'description': current_task['description'],
                'completed_at': datetime.now().isoformat(),
                'detection_method': detection['detection_method'],
                'confidence': detection.get('feedback_analysis', {}).get('confidence', 0)
            })
            
            # Add to feedback summary
            self.feedback_summary.append({
                'task_number': self.current_index + 1,
                'description': current_task['description'],
                'status': 'completed',
                'detection_method': detection['detection_method'],
                'confidence': detection.get('feedback_analysis', {}).get('confidence', 0)
            })
            
            # Save progress
            self.save_progress()
            
            # Move to next task
            self.current_index += 1
            
            return {
                'status': 'completed',
                'task_number': self.current_index,
                'description': current_task['description'],
                'detection_method': detection['detection_method'],
                'confidence': detection.get('feedback_analysis', {}).get('confidence', 0),
                'next_task': self.get_current_task()
            }
        else:
            return {
                'status': 'incomplete',
                'task_number': self.current_index + 1,
                'description': current_task['description'],
                'reason': 'Completion not detected',
                'confidence': detection.get('feedback_analysis', {}).get('confidence', 0)
            }
    
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
        
        # Save session log
        log_file = self.todo_file_path.parent / 'session_log.json'
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(self.session_log, f, indent=2)
        
        # Save feedback summary
        summary_file = self.todo_file_path.parent / 'feedback_summary.json'
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(self.feedback_summary, f, indent=2)
    
    def get_progress(self):
        """Get overall progress"""
        completed = sum(1 for task in self.tasks if task['completed'])
        total = len(self.tasks)
        percentage = (completed / total * 100) if total > 0 else 0
        
        return {
            'completed': completed,
            'total': total,
            'percentage': percentage,
            'current': self.current_index + 1,
            'remaining': total - completed
        }
    
    def generate_feedback_report(self):
        """Generate a readable feedback report"""
        progress = self.get_progress()
        
        report = []
        report.append("="*80)
        report.append("KMAINCMS UX IMPROVEMENT - SESSION FEEDBACK REPORT")
        report.append("="*80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        report.append("PROGRESS SUMMARY")
        report.append("-" * 40)
        report.append(f"Total Tasks: {progress['total']}")
        report.append(f"Completed: {progress['completed']}")
        report.append(f"Remaining: {progress['remaining']}")
        report.append(f"Progress: {progress['percentage']:.1f}%")
        report.append("")
        
        report.append("COMPLETED TASKS")
        report.append("-" * 40)
        for item in self.feedback_summary:
            report.append(f"✅ Task #{item['task_number']}: {item['description']}")
            report.append(f"   Detection: {item['detection_method']}")
            report.append(f"   Confidence: {item['confidence']}%")
            report.append("")
        
        if len(self.feedback_summary) == 0:
            report.append("No tasks completed in this session.")
            report.append("")
        
        report.append("DETECTION METHODS USED")
        report.append("-" * 40)
        detection_methods = {}
        for item in self.feedback_summary:
            method = item['detection_method']
            detection_methods[method] = detection_methods.get(method, 0) + 1
        
        for method, count in detection_methods.items():
            report.append(f"{method}: {count} tasks")
        
        report.append("")
        report.append("="*80)
        
        return "\n".join(report)

def main():
    # Initialize executor
    todo_file = "D:\\Kiserian Main SDA Communications Department\\KMainCMS\\todo-lists\\UX_IMPROVEMENT_TODO.md"
    project_path = "D:\\Kiserian Main SDA Communications Department\\KMainCMS"
    executor = AutomatedTodoExecutor(todo_file, project_path)
    
    print("\n" + "="*60)
    print("KMainCMS UX Improvement - Automated Executor")
    print("="*60 + "\n")
    
    # Show initial progress
    progress = executor.get_progress()
    print(f"Starting Progress: {progress['completed']}/{progress['total']} tasks completed ({progress['percentage']:.1f}%)")
    print(f"Tasks Remaining: {progress['remaining']}")
    print()
    
    # Interactive mode
    print("AUTOMATED EXECUTION MODE")
    print("-" * 40)
    print("This tool will:")
    print("1. Generate prompts for each task automatically")
    print("2. You execute the task and provide completion feedback")
    print("3. Tool automatically detects completion and moves to next task")
    print("4. Generates readable feedback report at the end")
    print()
    
    while True:
        current_task = executor.get_current_task()
        
        if current_task is None:
            print("\n🎉 All tasks completed!")
            print("\n" + executor.generate_feedback_report())
            break
        
        # Show current task
        print(f"\n{'='*60}")
        print(f"CURRENT TASK: #{executor.current_index + 1}")
        print(f"{'='*60}")
        print(f"Task: {current_task['description']}")
        print(f"Progress: {progress['completed']}/{progress['total']} ({progress['percentage']:.1f}%)")
        print()
        
        # Show prompt
        print("-" * 40)
        print("PROMPT (Copy this to execute the task):")
        print("-" * 40)
        print(current_task['prompt'])
        print("-" * 40)
        print()
        
        # Get completion feedback
        print("After executing the task, paste your completion feedback here.")
        print("Include details like: files modified, changes made, any issues encountered")
        print("Type 'skip' to skip this task, 'exit' to save and exit, or just press Enter if the task is complete:")
        
        feedback = input("Completion feedback: ").strip()
        
        if feedback.lower() == 'exit':
            print("\nSaving progress and generating feedback report...")
            print(executor.generate_feedback_report())
            break
        elif feedback.lower() == 'skip':
            print("Task skipped.")
            executor.current_index += 1
        else:
            # Process task with detection
            result = executor.process_task(feedback)
            
            if result['status'] == 'completed':
                print(f"\n✅ Task #{result['task_number']} completed!")
                print(f"Detection method: {result['detection_method']}")
                print(f"Confidence: {result['confidence']}%")
                
                # Update progress
                progress = executor.get_progress()
                print(f"Progress: {progress['completed']}/{progress['total']} ({progress['percentage']:.1f}%)")
            else:
                print(f"\n⚠️  Task completion not detected")
                print(f"Reason: {result['reason']}")
                print(f"Confidence: {result['confidence']}%")
                print("\nOptions:")
                print("1. Mark as complete anyway (type 'force')")
                print("2. Skip this task (type 'skip')")
                print("3. Provide more feedback (type 'feedback')")
                
                choice = input("Your choice: ").strip().lower()
                
                if choice == 'force':
                    executor.process_task(feedback='Task completed successfully')
                    print("✅ Task marked as complete (forced)")
                elif choice == 'skip':
                    executor.current_index += 1
                    print("Task skipped")
                elif choice == 'feedback':
                    continue  # Ask for more feedback
                else:
                    print("Invalid choice. Task remains incomplete.")
        
        print("\n" + "-"*60)
        input("Press Enter to continue to next task...")
        print("-" * 60)

if __name__ == "__main__":
    main()
