document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('userModal');
    const modalTitle = document.getElementById('modalTitle');
    const btnAddUser = document.getElementById('btnAddUser');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnSaveUser = document.getElementById('btnSaveUser');
    const inputUsername = document.getElementById('inputUsername');
    const inputPassword = document.getElementById('inputPassword');
    const selectRole = document.getElementById('selectRole');
    const editUsername = document.getElementById('editUsername');
    const modalError = document.getElementById('modalError');
    const lblPassword = document.getElementById('lblPassword');
    const groupUsername = document.getElementById('groupUsername');

    const openModal = (mode, username = '', role = 'user') => {
        modalError.style.display = 'none';
        inputPassword.value = '';
        if (mode === 'add') {
            modalTitle.textContent = 'Add User';
            editUsername.value = '';
            inputUsername.value = '';
            selectRole.value = 'user';
            groupUsername.style.display = 'block';
            lblPassword.textContent = 'Password';
        } else {
            modalTitle.textContent = 'Edit User: ' + username;
            editUsername.value = username;
            inputUsername.value = username;
            selectRole.value = role;
            groupUsername.style.display = 'block';
            lblPassword.textContent = 'New Password (leave blank to keep current)';
        }
        modal.classList.add('active');
    };

    const closeModal = () => {
        modal.classList.remove('active');
    };

    btnAddUser.addEventListener('click', () => openModal('add'));
    btnCloseModal.addEventListener('click', closeModal);

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const username = e.target.getAttribute('data-username');
            const role = e.target.getAttribute('data-role');
            openModal('edit', username, role);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const username = e.target.getAttribute('data-username');
            if(confirm(`Are you sure you want to delete user ${username}?`)) {
                try {
                    const res = await fetch(`/api/users/${username}`, { method: 'DELETE' });
                    const data = await res.json();
                    if(data.success) {
                        location.reload();
                    } else {
                        alert(data.error);
                    }
                } catch(e) {
                    alert('Error deleting user');
                }
            }
        });
    });

    btnSaveUser.addEventListener('click', async () => {
        const username = inputUsername.value.trim();
        const password = inputPassword.value;
        const role = selectRole.value;

        const isEdit = !!editUsername.value;
        
        if (!isEdit && (!username || !password)) {
            modalError.textContent = 'Username and password are required.';
            modalError.style.display = 'block';
            return;
        }

        const url = isEdit ? `/api/users/${username}` : `/api/users`;
        const method = isEdit ? 'PUT' : 'POST';

        const payload = { username, role };
        if (password) {
            payload.password = password;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                location.reload();
            } else {
                modalError.textContent = data.error || 'Failed to save.';
                modalError.style.display = 'block';
            }
        } catch (e) {
            modalError.textContent = 'Network error.';
            modalError.style.display = 'block';
        }
    });
});
