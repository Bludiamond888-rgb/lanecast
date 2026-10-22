"""Zip dist/ (contents at archive root) for drag-and-drop static hosting."""
import shutil, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
print(shutil.make_archive(os.path.join(root, '..', 'speedometer-deploy-v6'), 'zip', os.path.join(root, 'dist')))
