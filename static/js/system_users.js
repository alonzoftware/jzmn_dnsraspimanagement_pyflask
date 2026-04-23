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
    const btnTogglePassword = document.getElementById('btnTogglePassword');
    const iconEye = document.getElementById('iconEye');
    const iconEyeOff = document.getElementById('iconEyeOff');
    const sortSelect = document.getElementById('sortUsers');
    const tbody = document.querySelector('#usersTable tbody');

    if (sortSelect && tbody) {
        sortSelect.addEventListener('change', () => {
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const val = sortSelect.value;
            
            rows.sort((a, b) => {
                if (val === 'username') {
                    return a.dataset.username.localeCompare(b.dataset.username);
                } else if (val === 'role') {
                    return a.dataset.role.localeCompare(b.dataset.role) || a.dataset.username.localeCompare(b.dataset.username);
                } else if (val === 'last_login') {
                    const al = a.dataset.login || '';
                    const bl = b.dataset.login || '';
                    return bl.localeCompare(al) || a.dataset.username.localeCompare(b.dataset.username);
                }
            });
            
            tbody.innerHTML = '';
            rows.forEach(r => tbody.appendChild(r));
        });
        // Initial Sort
        sortSelect.dispatchEvent(new Event('change'));
    }

    if (btnTogglePassword) {
        btnTogglePassword.addEventListener('click', () => {
            if (inputPassword.type === 'password') {
                inputPassword.type = 'text';
                iconEye.style.display = 'none';
                iconEyeOff.style.display = 'block';
            } else {
                inputPassword.type = 'password';
                iconEye.style.display = 'block';
                iconEyeOff.style.display = 'none';
            }
        });
    }

    const openModal = (mode, username = '', role = 'user') => {
        modalError.style.display = 'none';
        inputPassword.value = '';
        
        selectRole.innerHTML = `
            <option value="user">User</option>
            <option value="admin">Admin</option>
        `;
        if (window.CURRENT_ROLE === 'sadmin' || role === 'sadmin') {
            selectRole.innerHTML += `<option value="sadmin">Super Admin</option>`;
        }
        
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
            const username = e.currentTarget.getAttribute('data-username');
            const role = e.currentTarget.getAttribute('data-role');
            openModal('edit', username, role);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const username = e.currentTarget.getAttribute('data-username');
            if(confirm(`Are you sure you want to delete user ${username}?`)) {
                try {
                    const res = await fetch(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
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

        const url = isEdit ? `/api/users/${encodeURIComponent(editUsername.value)}` : `/api/users`;
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
